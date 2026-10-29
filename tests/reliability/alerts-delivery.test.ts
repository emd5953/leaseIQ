import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SavedSearch, User, Listing, AlertHistory } from '../../src/models';
import { AlertDelivery } from '../../src/models/alertDelivery.model';
import { AlertService } from '../../src/services/alert.service';
import { EmailService } from '../../src/services/email.service';
import { createApp } from '../../src/api';
import { generateToken } from '../../src/api/middleware/auth';
import type { Server } from 'node:http';

describe('Scheduled deliveries in an isolated database', () => {
  let mongo: MongoMemoryServer;
  let user: any;
  let send: any;
  let server: Server;
  let origin: string;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([SavedSearch.init(), AlertDelivery.init(), AlertHistory.init()]);
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
    await Promise.all([
      SavedSearch.deleteMany({}),
      User.deleteMany({}),
      Listing.deleteMany({}),
      AlertHistory.deleteMany({}),
      AlertDelivery.deleteMany({}),
    ]);
    user = await User.create({
      email: 'owner@example.com',
      passwordHash: 'fixture',
      salt: 'fixture',
    });
    vi.spyOn(EmailService, 'isConfigured').mockReturnValue(true);
    send = vi
      .spyOn(EmailService, 'send')
      .mockResolvedValue({ success: true, messageId: 'fixture-provider-id' });
  });
  afterEach(() => vi.restoreAllMocks());
  async function search(extra: any = {}) {
    return SavedSearch.create({
      userId: user._id,
      name: 'Fixture search',
      criteria: {},
      alertsEnabled: true,
      isActive: true,
      alertFrequency: 'immediate',
      alertMethod: 'email',
      createdAt: new Date(Date.now() - 8 * 86400000),
      ...extra,
    });
  }
  async function listing(count = 1) {
    await Listing.collection.insertMany(
      Array.from({ length: count }, (_, i) => ({
        _id: new Types.ObjectId(),
        address: { street: `${i + 1} Fixture Street`, city: 'Manhattan' },
        price: { amount: 2100, status: 'known' },
        createdAt: new Date(),
        sources: [
          { source: 'fixture', sourceUrl: 'https://example.com/fixture', lastSeenAt: new Date() },
        ],
      })),
    );
  }
  it('respects disabled alerts, active state, daily and weekly schedules', async () => {
    await listing();
    for (const settings of [
      { alertsEnabled: false },
      { isActive: false },
      { alertFrequency: 'daily', lastDeliveryAt: new Date() },
      { alertFrequency: 'weekly', lastDeliveryAt: new Date(Date.now() - 2 * 86400000) },
    ]) {
      const s = await search(settings);
      await AlertService.sendImmediateAlert(String(s._id), String(user._id));
    }
    expect(send).not.toHaveBeenCalled();
    for (const alertFrequency of ['daily', 'weekly']) {
      const s = await search({ alertFrequency });
      expect((await AlertService.sendImmediateAlert(String(s._id), String(user._id))).sent).toBe(
        true,
      );
    }
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('implements in-app and both methods without substituting email', async () => {
    await listing();
    const app = await search({ alertMethod: 'in-app' });
    const both = await search({ alertMethod: 'both' });
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      await AlertDelivery.countDocuments({
        savedSearchId: app._id,
        method: 'in-app',
        status: 'sent',
      }),
    ).toBe(1);
    expect(
      await AlertHistory.countDocuments({ savedSearchId: both._id, deliveryStatus: 'sent' }),
    ).toBe(2);
    const token = generateToken(String(user._id), user.email);
    const response = await fetch(origin + '/api/alerts/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(await response.json()).toHaveLength(2);
  });
  it('prevents concurrent and repeated deliveries', async () => {
    await listing();
    const s = await search();
    await Promise.all(
      Array.from({ length: 6 }, () =>
        AlertService.sendImmediateAlert(String(s._id), String(user._id)),
      ),
    );
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await AlertHistory.countDocuments({ deliveryStatus: 'sent' })).toBe(1);
  });
  it('retries a failed email using the same immutable key, preserving successful in-app delivery', async () => {
    await listing();
    const s = await search({ alertMethod: 'both' });
    send.mockResolvedValueOnce({ success: false, error: 'fixture failure' });
    expect((await AlertService.processAlerts()).errors).toBe(1);
    expect((await SavedSearch.findById(s._id))?.lastDeliveryAt).toBeUndefined();
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
    expect(await AlertDelivery.countDocuments({ method: 'in-app' })).toBe(1);
    expect(await AlertHistory.countDocuments({ deliveryStatus: 'sent' })).toBe(2);
    expect((await AlertDelivery.findOne({ method: 'email' }))?.attempts).toBe(2);
  });
  it('requires review after ambiguous delivery exceeds the idempotency window', async () => {
    await listing();
    await search();
    send.mockResolvedValueOnce({ success: false, error: 'timeout' });
    await AlertService.processAlerts();
    await AlertDelivery.updateMany(
      {},
      { firstAttemptAt: new Date(Date.now() - 25 * 3600000), status: 'sending' },
    );
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await AlertDelivery.findOne())?.status).toBe('review');
  });
  it('captures a configured sender on the first attempt and preserves it across retries', async () => {
    await listing();
    await search();
    vi.mocked(EmailService.isConfigured).mockReturnValueOnce(false);
    const sender = vi.spyOn(EmailService, 'senderAddress').mockReturnValue('');
    await AlertService.processAlerts();
    expect(send).not.toHaveBeenCalled();
    sender.mockReturnValue('LeaseIQ <alerts@example.com>');
    send.mockResolvedValueOnce({ success: false, error: 'timeout', uncertain: true });
    await AlertService.processAlerts();
    expect(send.mock.calls[0][0].from).toBe('LeaseIQ <alerts@example.com>');
    sender.mockReturnValue('LeaseIQ <changed@example.com>');
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0]);
    expect((await AlertDelivery.findOne())?.status).toBe('sent');
  });
  it('reconciles a crash after delivery without sending again', async () => {
    await listing();
    const s = await search({ alertFrequency: 'daily' });
    await AlertService.processAlerts();
    await AlertHistory.deleteMany({});
    await AlertDelivery.updateMany({}, { historyRecorded: false });
    await SavedSearch.updateOne({ _id: s._id }, { $unset: { lastDeliveryAt: 1 } });
    await listing();
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await AlertHistory.countDocuments({ deliveryStatus: 'sent' })).toBe(1);
    expect((await AlertDelivery.findOne())?.historyRecorded).toBe(true);
    expect((await SavedSearch.findById(s._id))?.lastDeliveryAt).toBeTruthy();
  });
  it('keeps definite provider rejections retryable after the ambiguous-delivery window', async () => {
    await listing();
    await search();
    send.mockResolvedValueOnce({
      success: false,
      error: 'Rejected before acceptance',
      uncertain: false,
    });
    await AlertService.processAlerts();
    expect((await AlertDelivery.findOne())?.firstAttemptAt).toBeUndefined();
    await AlertDelivery.updateMany({}, { firstAttemptAt: new Date(Date.now() - 25 * 3600000) });
    await AlertService.processAlerts();
    expect(send).toHaveBeenCalledTimes(2);
    expect((await AlertDelivery.findOne())?.status).toBe('sent');
  });
  it('rotates beyond the first 100 searches, and drains listing batches without skipping', async () => {
    for (let i = 0; i < 102; i++) await search({ alertsEnabled: true, alertMethod: 'in-app' });
    await listing(53);
    await AlertService.processAlerts();
    await AlertService.processAlerts();
    await AlertService.processAlerts();
    expect(await SavedSearch.countDocuments({ lastAlertCheckedAt: { $exists: true } })).toBe(102);
    const ids = await AlertDelivery.distinct('listingIds');
    expect(ids).toHaveLength(53);
    expect(send).not.toHaveBeenCalled();
  }, 30000);
  it('denies another account access to trigger and notification endpoints', async () => {
    await listing();
    const s = await search({ alertMethod: 'in-app' });
    await AlertService.processAlerts();
    const token = generateToken(String(new Types.ObjectId()), 'other@example.com');
    const headers = { Authorization: `Bearer ${token}` };
    expect(
      (await fetch(origin + `/api/alerts/send/${s._id}`, { method: 'POST', headers })).status,
    ).toBe(404);
    const note = await AlertDelivery.findOne();
    expect(
      (
        await fetch(origin + `/api/alerts/notifications/${note!._id}/read`, {
          method: 'PATCH',
          headers,
        })
      ).status,
    ).toBe(404);
    expect(await (await fetch(origin + '/api/alerts/notifications', { headers })).json()).toEqual(
      [],
    );
  });
});
