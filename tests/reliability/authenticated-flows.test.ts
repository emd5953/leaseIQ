import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import type { Server } from 'node:http';
import { createApp } from '../../src/api';
import { generateToken } from '../../src/api/middleware/auth';
import { Listing, ListingInteraction, SavedSearch, AlertHistory, User } from '../../src/models';
import { LeaseService } from '../../src/services/lease.service';
import { EmailService } from '../../src/services/email.service';
import { CombinedAnalysisService } from '../../src/services/combined-analysis.service';
import { AlertService, alertIsDue } from '../../src/services/alert.service';
let mongo: MongoMemoryServer, server: Server, base: string;
let userId: Types.ObjectId, token: string, otherToken: string, listingId: string;
const report = { summary: 'Fictional lease', overallRating: 'neutral', keyTerms: { monthlyRent: '$3,200' }, importantDates: [], redFlags: [], financialSummary: {}, tenantRights: [], landlordObligations: [], terminationClauses: [], recommendations: [] } as any;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));
  await mongoose.disconnect(); await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), ListingInteraction.deleteMany({}), SavedSearch.deleteMany({}), AlertHistory.deleteMany({})]);
  const user = await User.create({ email: 'qa@example.com', passwordHash: 'test', salt: 'test' });
  userId = user._id as Types.ObjectId; token = generateToken(String(userId), 'qa@example.com');
  otherToken = generateToken(String(new Types.ObjectId()), 'other@example.com');
  const listing = await Listing.create({ address: { street: '123 Test St', city: 'Brooklyn', state: 'NY', zipCode: '11216' }, price: { amount: 3200, currency: 'USD', period: 'monthly' }, bedrooms: 1, bathrooms: 1, sources: [{ source: 'Test', sourceId: 'qa', sourceUrl: 'https://example.com/qa', firstSeenAt: new Date(), lastSeenAt: new Date() }], isActive: true });
  listingId = String(listing._id);
  vi.spyOn(EmailService, 'sendListingAlert').mockResolvedValue({ success: true });
  vi.spyOn(LeaseService, 'analyzeLeasePDF').mockResolvedValue(report);
  vi.spyOn(LeaseService, 'sendLeaseAnalysis').mockResolvedValue({ success: true });
});
afterEach(() => vi.restoreAllMocks());
const request = (path: string, method = 'GET', body?: unknown, auth = token) => fetch(base + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
function upload(path = '/api/lease/upload', options: { type?: string; size?: number; email?: string; auth?: string; fields?: string[]; sendEmail?: string } = {}) {
  const form = new FormData();
  for (const field of options.fields || ['file']) form.append(field, new Blob([options.size ? new Uint8Array(options.size) : '%PDF-1.7 fictional'], { type: options.type || 'application/pdf' }), 'test.pdf');
  if (options.email) form.append('email', options.email);
  if (options.sendEmail) form.append('sendEmail', options.sendEmail);
  return fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${options.auth ?? token}` }, body: form });
}
async function search(criteria = {}, extra = {}) {
  return SavedSearch.create({ userId, name: 'QA', criteria, alertsEnabled: false, alertFrequency: 'daily', alertMethod: 'email', ...extra });
}
describe('Saved listing account lifecycle', () => {
  it('persists saves and tracker status without duplicates or overwriting metadata on repeat save', async () => {
    const path = `/api/user/saved-listings/${listingId}`;
    expect((await request(path, 'POST', { notes: 'Tour at noon' })).status).toBe(200);
    expect((await request(path, 'PATCH', { status: 'touring' })).status).toBe(200);
    expect((await request(path, 'POST', {})).status).toBe(200);
    const rows = await (await request('/api/user/saved-listings')).json();
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ _id: listingId, notes: 'Tour at noon', status: 'touring' });
    expect(await ListingInteraction.countDocuments()).toBe(1);
    expect(await (await request('/api/user/saved-listings', 'GET', undefined, otherToken)).json()).toEqual([]);
    expect((await request(path, 'PATCH', { status: 'lease' }, otherToken)).status).toBe(404);
    await request(path, 'DELETE', undefined, otherToken);
    expect(await ListingInteraction.countDocuments()).toBe(1);
    expect((await request(path, 'DELETE')).status).toBe(200);
    expect(await (await request('/api/user/saved-listings')).json()).toEqual([]);
  });
  it('rejects malformed IDs and tracker status, and excludes missing listings', async () => {
    expect((await request('/api/user/saved-listings/bad', 'POST', {})).status).toBe(400);
    expect((await request(`/api/user/saved-listings/${listingId}`, 'POST', { status: 'fake' })).status).toBe(400);
    await request(`/api/user/saved-listings/${listingId}`, 'POST', {});
    await Listing.deleteMany({});
    expect(await (await request('/api/user/saved-listings')).json()).toEqual([]);
  });
});
describe('Account alerts', () => {
  it('creates, pauses and deletes an owned alert; rejects cross-account sends and scheduler triggers', async () => {
    const created = await request('/api/user/saved-searches', 'POST', { name: 'QA', criteria: { maxPrice: 4000 }, alertsEnabled: true });
    expect(created.status).toBe(201); const s = await created.json();
    const path = `/api/user/saved-searches/${s._id}`;
    expect((await request(path, 'PUT', { alertsEnabled: false })).status).toBe(200);
    expect((await SavedSearch.findById(s._id))?.alertsEnabled).toBe(false);
    expect((await request(`/api/alerts/send/${s._id}`, 'POST', {}, otherToken)).status).toBe(404);
    expect((await request(`${path}/test-alert`, 'POST', {}, otherToken)).status).toBe(404);
    expect((await request('/api/alerts/process', 'POST', {})).status).toBe(403);
    expect(EmailService.sendListingAlert).not.toHaveBeenCalled();
    expect((await request(path, 'DELETE')).status).toBe(200);
  });
  it('returns failures honestly and records failed delivery without changing the schedule', async () => {
    const none = await search({ maxPrice: 1 });
    const noMatch = await request(`/api/user/saved-searches/${none._id}/test-alert`, 'POST');
    expect(noMatch.status).toBe(400); expect((await noMatch.json()).error).toContain('No matching');
    const s = await search({ maxPrice: 4000 });
    vi.mocked(EmailService.sendListingAlert).mockResolvedValue({ success: false, error: 'Provider rejected email' });
    const failed = await request(`/api/user/saved-searches/${s._id}/test-alert`, 'POST');
    expect(failed.status).toBe(400); expect((await failed.json()).error).toBe('Provider rejected email');
    expect((await AlertHistory.findOne({ savedSearchId: s._id }))?.deliveryStatus).toBe('failed');
    expect((await SavedSearch.findById(s._id))?.lastAlertSentAt).toBeNull();
  });
  it('tests a paused search without advancing its scheduled watermark', async () => {
    const s = await search({ maxPrice: 4000 });
    const result = await request(`/api/user/saved-searches/${s._id}/test-alert`, 'POST');
    expect(result.status).toBe(200); expect((await result.json()).success).toBe(true);
    expect(EmailService.sendListingAlert).toHaveBeenCalledTimes(1);
    expect((await SavedSearch.findById(s._id))?.lastAlertSentAt).toBeNull();
    expect(await AlertHistory.countDocuments({ deliveryStatus: 'sent' })).toBe(1);
  });
  it('honors digest frequency and skips paused searches', async () => {
    const now = Date.now();
    expect(alertIsDue({ alertFrequency: 'daily', lastAlertSentAt: new Date(now - 86400000) }, now)).toBe(true);
    expect(alertIsDue({ alertFrequency: 'weekly', lastAlertSentAt: new Date(now - 86400000) }, now)).toBe(false);
    expect(alertIsDue({ alertFrequency: 'immediate', lastAlertSentAt: new Date(now) }, now)).toBe(true);
    const recent = new Date(now - 1000);
    await search({}, { alertsEnabled: true, lastAlertSentAt: recent });
    await search({}, { alertsEnabled: true, alertFrequency: 'weekly', lastAlertSentAt: recent });
    await search({}, { alertsEnabled: false });
    await search({}, { alertsEnabled: true, lastAlertSentAt: new Date(now - 2 * 86400000) });
    const result = await AlertService.processAlerts();
    expect(result).toEqual({ processed: 1, sent: 1, errors: 0 });
    expect(EmailService.sendListingAlert).toHaveBeenCalledTimes(1);
  });
});
describe('Authenticated multipart lease flows', () => {
  it('requires a session and accepts a signed-in document upload', async () => {
    expect((await upload('/api/lease/upload', { auth: '' })).status).toBe(401);
    const result = await upload(); expect(result.status).toBe(200);
    expect((await result.json()).analysis.keyTerms.monthlyRent).toBe('$3,200');
    expect(LeaseService.analyzeLeasePDF).toHaveBeenCalledTimes(1);
    expect(LeaseService.sendLeaseAnalysis).not.toHaveBeenCalled();
  });
  it('returns useful JSON for invalid, oversized and missing uploads', async () => {
    expect((await upload('/api/lease/upload', { type: 'text/plain' })).status).toBe(400);
    const large = await upload('/api/lease/upload', { size: 10 * 1024 * 1024 + 1 });
    expect(large.status).toBe(413); expect((await large.json()).error).toContain('10MB');
    expect((await upload('/api/property/analyze', { fields: [] })).status).toBe(400);
    expect(LeaseService.analyzeLeasePDF).not.toHaveBeenCalled();
  });
  it('keeps email on the signed-in account and respects false', async () => {
    expect((await upload('/api/lease/upload', { email: 'other@example.com' })).status).toBe(400);
    expect(LeaseService.analyzeLeasePDF).not.toHaveBeenCalled();
    const result = await upload('/api/property/analyze-lease-only', { fields: ['lease'], email: 'qa@example.com', sendEmail: 'false' });
    expect(result.status).toBe(200); expect((await result.json()).emailSent).toBe(false);
    expect(LeaseService.sendLeaseAnalysis).not.toHaveBeenCalled();
  });
  it('reports provider failure without fabricating a successful report', async () => {
    vi.mocked(LeaseService.analyzeLeasePDF).mockRejectedValue(new Error('provider secret detail'));
    const result = await upload(); expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ error: 'Document analysis is temporarily unavailable. Please retry.' });
  });
  it('preserves every lease field in combined reports and accepts DOCX', async () => {
    vi.spyOn(CombinedAnalysisService, 'analyzeCombined').mockResolvedValue({ lease: report, emailSent: false });
    const result = await upload('/api/property/analyze', { fields: ['lease'], type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(result.status).toBe(200); expect((await result.json()).analysis.lease).toEqual(report);
  });
});
