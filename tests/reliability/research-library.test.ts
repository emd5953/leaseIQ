import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Server } from 'node:http';
import { createApp } from '../../src/api';
import { generateToken } from '../../src/api/middleware/auth';
import { reportReceipt } from '../../src/services/research-library.service';
import { ResearchSnapshot, ResearchComparison } from '../../src/models/researchSnapshot.model';
import { ScrapingJobModel } from '../../src/ingestion/models/scrapingJob.schema';
describe('Account research and deliberate sharing', () => {
  let mongo: MongoMemoryServer, server: Server, origin: string;
  const owner = String(new Types.ObjectId()),
    other = String(new Types.ObjectId());
  const report: any = {
    version: 2,
    address: '100 Fixture Street, Manhattan',
    generatedAt: '2026-10-01T12:00:00.000Z',
    match: { status: 'matched', buildingId: '123' },
    sources: [{ id: 'buildings', retrievedAt: '2026-10-01', datasetUpdatedAt: '2026-09-20' }],
    sections: [],
    metrics: [],
    violations: [],
    limitations: ['Fixture only'],
  };
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([ResearchSnapshot.init(), ResearchComparison.init()]);
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    origin = `http://127.0.0.1:${(server.address() as any).port}`;
  }, 60000);
  afterAll(async () => {
    server?.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await mongoose.disconnect();
    await mongo?.stop();
  });
  beforeEach(async () => {
    await Promise.all([ResearchSnapshot.deleteMany({}), ResearchComparison.deleteMany({})]);
  });
  function request(path: string, method = 'GET', body?: unknown, user = owner) {
    return fetch(origin + '/api/research-library' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(user ? { Authorization: `Bearer ${generateToken(user, 'fixture@example.com')}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  async function save() {
    return (await request('/snapshots', 'POST', { report, receipt: reportReceipt(report) })).json();
  }
  it('saves only server-issued evidence and makes retries idempotent', async () => {
    const a = await save(),
      b = await save();
    expect(a._id).toBe(b._id);
    expect(a.report).toEqual(report);
    expect(
      (
        await request('/snapshots', 'POST', {
          report: { ...report, address: 'Different building' },
          receipt: reportReceipt(report),
        })
      ).status,
    ).toBe(400);
    expect(
      (await request('/snapshots', 'POST', { report, receipt: reportReceipt(report) }, '')).status,
    ).toBe(401);
  });
  it('keeps private history and comparisons scoped to the owner', async () => {
    const item = await save();
    expect((await request('/comparison', 'PUT', { snapshotIds: [item._id] })).status).toBe(200);
    expect((await (await request('/comparison')).json()).snapshots[0].report.sources).toEqual(
      report.sources,
    );
    expect((await request('/comparison', 'PUT', { snapshotIds: [item._id] }, other)).status).toBe(
      404,
    );
    expect((await (await request('/history', 'GET', undefined, other)).json()).snapshots).toEqual(
      [],
    );
    expect(
      (await request('/comparison', 'PUT', { snapshotIds: [item._id, item._id] })).status,
    ).toBe(400);
  });
  it('requires owner opt-in, preserves source dates, hides account data, and revokes links', async () => {
    const item = await save();
    expect((await request(`/snapshots/${item._id}/share`, 'POST', {})).status).toBe(400);
    expect(
      (await request(`/snapshots/${item._id}/share`, 'POST', { enabled: true }, other)).status,
    ).toBe(404);
    const shared = await (
      await request(`/snapshots/${item._id}/share`, 'POST', { enabled: true })
    ).json();
    const token = shared.path.split('/').pop();
    const response = await request(`/shared/${token}`, 'GET', undefined, '');
    const data = await response.json();
    expect(data.report).toEqual(report);
    expect(data).not.toHaveProperty('userId');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await request(`/snapshots/${item._id}/share`, 'DELETE', undefined, other)).status).toBe(
      404,
    );
    await request(`/snapshots/${item._id}/share`, 'DELETE');
    expect((await request(`/shared/${token}`, 'GET', undefined, '')).status).toBe(404);
  });
  it('keeps tracker writes owner-scoped, preserves repeated saves, and retains missing listing references', async () => {
    const id = new Types.ObjectId();
    const listings = mongoose.connection.db!.collection('listings');
    await listings.insertOne({ _id: id, address: { street: 'Fixture only', city: 'Manhattan' } });
    const call = (method: string, body?: unknown, user = owner, path = `/saved-listings/${id}`) =>
      fetch(origin + '/api/user' + path, {
        method,
        headers: {
          Authorization: `Bearer ${generateToken(user, 'fixture@example.com')}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    expect((await call('POST', {})).status).toBe(200);
    expect((await call('PATCH', { status: 'touring', notes: 'Fixture notes' }, other)).status).toBe(
      404,
    );
    expect((await call('PATCH', { status: 'invented' })).status).toBe(400);
    expect((await call('PATCH', { status: 'touring', notes: 'Fixture notes' })).status).toBe(200);
    const repeated = await (await call('POST', {})).json();
    expect(repeated.interaction.metadata).toMatchObject({
      status: 'touring',
      notes: 'Fixture notes',
    });
    await listings.deleteOne({ _id: id });
    const saved = await (await call('GET', undefined, owner, '/saved-listings')).json();
    expect(saved.find((row: any) => row._id === String(id))).toMatchObject({
      listingUnavailable: true,
      status: 'touring',
      notes: 'Fixture notes',
    });
  });
  it('reports absent, overdue, failed and partially successful jobs without hiding legacy data', async () => {
    const health = async () => (await fetch(origin + '/api/jobs/health')).json();
    expect((await health()).refresh.status).toBe('never_run');
    const inserted = await ScrapingJobModel.collection.insertOne({
      jobId: 'fixture',
      status: 'completed',
      createdAt: new Date(),
      endTime: new Date(Date.now() - 2 * 3600000),
    } as any);
    expect((await health()).refresh.status).toBe('overdue');
    await ScrapingJobModel.collection.updateOne(
      { _id: inserted.insertedId },
      { $set: { endTime: new Date() } },
    );
    expect((await health()).refresh).toMatchObject({ status: 'healthy', lastRun: { sources: [] } });
    await ScrapingJobModel.collection.updateOne(
      { _id: inserted.insertedId },
      { $set: { errorsEncountered: 1 } },
    );
    expect((await health()).refresh.status).toBe('degraded');
    await ScrapingJobModel.collection.updateOne(
      { _id: inserted.insertedId },
      { $set: { status: 'failed' } },
    );
    expect((await health()).refresh.status).toBe('failed');
  });
});
