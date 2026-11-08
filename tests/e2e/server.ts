/** Only launched by the browser test harness; not part of production builds. */
import mongoose from 'mongoose';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OAuth2Client } from 'google-auth-library';
import { createApp } from '../../src/api';
import { Listing, User, SavedSearch, ListingInteraction } from '../../src/models';
import { ResearchSnapshot, ResearchComparison } from '../../src/models/researchSnapshot.model';
import { NycDataClient, Dataset, DataResult } from '../../src/research/nyc-data';
import { LeaseService } from '../../src/services/lease.service';
import { FloorPlanService } from '../../src/services/floorplan.service';
import { EmailService } from '../../src/services/email.service';
if (process.env.NODE_ENV !== 'test' || process.env.LEASEIQ_E2E !== '1' || process.env.MONGODB_URI)
  throw new Error('Fixture server requires isolated test environment');
const settings = {
  trackerFailures: 0,
  leaseFails: false,
  floorFails: false,
  emailFails: false,
  sourceUnavailable: false,
};
// No test is allowed to send real email, call paid APIs, or fetch public research.
globalThis.fetch = async () => {
  throw new Error('External network is forbidden in the fixture server');
};
(OAuth2Client.prototype as any).getToken = async ({ code }: any) => {
  if (code !== 'fixture-google-code') throw new Error('Invalid fixture code');
  return { tokens: { id_token: 'fixture-id-token' } };
};
(OAuth2Client.prototype as any).verifyIdToken = async ({ idToken }: any) => {
  if (idToken !== 'fixture-id-token') throw new Error('Invalid fixture token');
  return {
    getPayload: () => ({
      sub: 'fixture-user',
      email: 'browser-fixture@example.com',
      email_verified: true,
      name: 'Browser Fixture',
    }),
  };
};
NycDataClient.prototype.query = async function (
  dataset: Dataset,
  params: Record<string, string>,
): Promise<DataResult> {
  if (settings.sourceUnavailable && dataset === 'registrations')
    return {
      rows: [],
      source: {
        id: dataset,
        name: 'HPD registrations fixture',
        url: 'https://data.cityofnewyork.us/',
        retrievedAt: new Date().toISOString(),
        datasetUpdatedAt: null,
        status: 'unavailable',
        detail: 'Controlled fixture outage',
      },
    };
  let rows: any[] = [];
  if (dataset === 'buildings') {
    const buildings = [
      {
        buildingid: '10001',
        bin: '1000001',
        block: '100',
        lot: '1',
        housenumber: '100',
        streetname: 'FIXTURE STREET',
        boro: 'MANHATTAN',
      },
      {
        buildingid: '20001',
        bin: '1000002',
        block: '200',
        lot: '1',
        housenumber: '200',
        streetname: 'FIXTURE AVENUE',
        boro: 'MANHATTAN',
      },
    ];
    rows = buildings.filter(
      (b) =>
        params.$where.includes(`housenumber='${b.housenumber}'`) &&
        (params.$where.includes(`streetname='${b.streetname}'`) ||
          params.$where.includes('streetname like')),
    );
  } else if (dataset === 'violations')
    rows = params.$group
      ? [{ class: 'C', violationstatus: 'Open', count: '2' }]
      : [
          {
            violationid: '42',
            class: 'C',
            violationstatus: 'Open',
            novdescription: 'Controlled fixture violation; not a real finding',
            novissueddate: '2026-09-01',
          },
        ];
  else if (dataset === 'pluto')
    rows = [{ yearbuilt: '1970', unitsres: '12', ownername: 'Controlled Fixture Owner' }];
  return {
    rows,
    source: {
      id: dataset,
      name: `${dataset} · controlled browser fixture`,
      url: 'https://data.cityofnewyork.us/',
      retrievedAt: new Date().toISOString(),
      datasetUpdatedAt: '2026-09-20T00:00:00.000Z',
      status: rows.length ? 'available' : 'empty',
      detail: 'Controlled test fixture, not a live research finding.',
    },
  };
};
LeaseService.analyzeLeasePDF = async () => {
  if (settings.leaseFails) throw new Error('Fixture extraction failure');
  return {
    summary: 'Controlled lease fixture summary',
    overallRating: 'neutral',
    redFlags: [],
    keyTerms: { monthlyRent: '$2100', securityDeposit: '$2100' },
    importantDates: [],
    financialSummary: { monthlyTotal: '$2100' },
    tenantRights: [],
    landlordObligations: [],
    terminationClauses: [],
    recommendations: ['Verify fixture terms'],
  };
};
FloorPlanService.analyzeFloorPlan = async () => {
  if (settings.floorFails) throw new Error('Fixture vision failure');
  return {
    summary: 'Controlled floor plan fixture summary',
    layout: { bedrooms: 1, bathrooms: 1, totalRooms: 3 },
    features: ['Fixture closet'],
    pros: [],
    cons: [],
    spaceEfficiency: 'Good',
    recommendations: [],
  };
};
EmailService.send = async () =>
  settings.emailFails
    ? { success: false, error: 'Controlled fixture email failure' }
    : { success: true, messageId: 'fixture-only-no-email-sent' };
async function main() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    Listing.init(),
    User.init(),
    SavedSearch.init(),
    ListingInteraction.init(),
    ResearchSnapshot.init(),
    ResearchComparison.init(),
  ]);
  async function reset() {
    for (const collection of Object.values(mongoose.connection.collections))
      await collection.deleteMany({});
    Object.assign(settings, {
      trackerFailures: 0,
      leaseFails: false,
      floorFails: false,
      emailFails: false,
      sourceUnavailable: false,
    });
    await Listing.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      address: {
        street: '100 Fixture Street',
        unit: '1A',
        city: 'Manhattan',
        state: 'NY',
        zipCode: '10001',
      },
      price: { amount: 2100, status: 'known', currency: 'USD', period: 'monthly' },
      bedrooms: 1,
      bathrooms: 1,
      description: 'Controlled browser fixture. Not a real rental listing.',
      sources: [
        {
          source: 'streeteasy',
          sourceId: 'browser-fixture',
          sourceUrl: 'https://example.com/fixture-only',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      ],
      isActive: true,
    });
  }
  await reset();
  const app = express();
  app.use(express.json());
  app.post('/__fixtures/reset', async (_req, res) => {
    await reset();
    res.json({ success: true });
  });
  app.post('/__fixtures/settings', (req, res) => {
    Object.assign(settings, req.body);
    res.json({ success: true });
  });
  app.patch('/api/user/saved-listings/:id', (req, res, next) => {
    if (settings.trackerFailures > 0) {
      settings.trackerFailures--;
      return res.status(503).json({ error: 'Controlled fixture save failure' });
    }
    next();
  });
  app.use(createApp());
  const server = app.listen(Number(process.env.PORT), '127.0.0.1', () =>
    console.log('Isolated browser fixtures ready'),
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  }
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  process.on('message', (message) => {
    if ((message as any)?.type === 'shutdown') void stop();
  });
  process.on('disconnect', stop);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
