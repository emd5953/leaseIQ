import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import type { Server } from 'node:http';
import { createApp } from '../../src/api';
import { User } from '../../src/models/user.model';
import { config } from '../../src/config';
import { repairUserIndexes } from '../../src/maintenance/user-indexes';
import { googlePopupOrigin } from '../../src/utils/google-auth-origin';

let mongo: MongoMemoryServer;
let server: Server;
let base: string;
const origin = 'https://lease-iq.vercel.app';
const credentials = { ...config.google };
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  config.google.oauthClientId = 'test-client';
  config.google.oauthClientSecret = 'test-secret';
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  Object.assign(config.google, credentials);
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await mongoose.disconnect(); await mongo.stop();
});
beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  await mongoose.connection.db!.createCollection('users');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function post(body: unknown, requestOrigin: string | null = origin) {
  return fetch(`${base}/api/auth/google/code`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(requestOrigin ? { Origin: requestOrigin } : {}) }, body: JSON.stringify(body) });
}
const account = (email: string, supabaseId?: string) => ({ email, passwordHash: 'oauth-user', salt: 'oauth', ...(supabaseId ? { supabaseId } : {}) });

describe('Existing production account indexes', () => {
  it('reproduces the second Google signup failure and repairs without changing accounts', async () => {
    const users = mongoose.connection.db!.collection('users');
    await users.createIndex({ supabaseId: 1 }, { name: 'supabaseId_1', unique: true });
    await users.createIndex({ email: 1 }, { name: 'email_1' });
    const first = await User.create(account('first@example.com'));
    await expect(User.create(account('second@example.com'))).rejects.toMatchObject({ code: 11000 });
    const before = await users.find({}).toArray();
    await repairUserIndexes(users); // dry-run is the default
    expect(await users.indexes()).toHaveLength(3);
    await repairUserIndexes(users, true);
    expect(await users.find({}).toArray()).toEqual(before);
    await User.create(account('second@example.com'));
    expect(await User.countDocuments()).toBe(2);
    expect((await User.findById(first._id))?.email).toBe('first@example.com');
    await expect(User.create(account('first@example.com'))).rejects.toMatchObject({ code: 11000 });
    await User.create(account('legacy@example.com', 'legacy-123'));
    await expect(User.create(account('other@example.com', 'legacy-123'))).rejects.toMatchObject({ code: 11000 });
    const indexes = await users.indexes();
    await repairUserIndexes(users, true);
    expect(await users.indexes()).toEqual(indexes);
  });
  it('refuses duplicate emails before changing any index or account', async () => {
    const users = mongoose.connection.db!.collection('users');
    await users.createIndex({ email: 1 }, { name: 'email_1' });
    await users.insertMany([{ email: 'same@example.com' }, { email: 'same@example.com' }]);
    const before = await users.indexes();
    await expect(repairUserIndexes(users, true)).rejects.toThrow('manual review');
    expect(await users.indexes()).toEqual(before);
    expect(await users.countDocuments()).toBe(2);
  });
});

describe('Google popup code exchange', () => {
  it('uses the allowed page origin, signs in two accounts, and preserves the returning account ID', async () => {
    await repairUserIndexes(mongoose.connection.db!.collection('users'), true);
    const exchange = vi.spyOn(OAuth2Client.prototype, 'getToken').mockResolvedValue({ tokens: { id_token: 'verified-token' } } as any);
    const verify = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => ({ email: 'first@example.com', name: 'First', email_verified: true }) } as any);
    const first = await post({ code: 'popup-code', redirect_uri: 'postmessage' });
    expect(first.status).toBe(200);
    const signedIn = await first.json();
    expect(exchange).toHaveBeenCalledWith({ code: 'popup-code', redirect_uri: origin });
    const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${signedIn.token}` } });
    expect(me.status).toBe(200);
    expect((await me.json()).id).toBe(signedIn.user.id);
    expect((await (await post({ code: 'returning-code' })).json()).user.id).toBe(signedIn.user.id);
    verify.mockResolvedValue({ getPayload: () => ({ email: 'second@example.com', name: 'Second', email_verified: true }) } as any);
    expect((await post({ code: 'another-code' })).status).toBe(200);
    expect(await User.countDocuments()).toBe(2);
  });
  it('rejects missing or untrusted origins and malformed codes before calling Google', async () => {
    const exchange = vi.spyOn(OAuth2Client.prototype, 'getToken');
    for (const value of [null, 'https://evil.example', origin + '.evil.example', origin + '/path']) {
      expect((await post({ code: 'code', redirect_uri: origin }, value)).status).toBe(403);
    }
    expect((await post({ code: {} })).status).toBe(400);
    expect(exchange).not.toHaveBeenCalled();
  });
  it('reports expired codes without disclosing tokens or provider responses', async () => {
    vi.spyOn(OAuth2Client.prototype, 'getToken').mockRejectedValue({ response: { data: { error: 'invalid_grant', secret: 'never-return-this' } } });
    const response = await post({ code: 'expired-code' });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Your Google sign-in expired. Please try signing in again.' });
    expect(await User.countDocuments()).toBe(0);
  });
  it('does not allow localhost or credential-bearing origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('FRONTEND_URL', origin);
    expect(googlePopupOrigin('http://localhost:3000')).toBeNull();
    expect(googlePopupOrigin('https://user@lease-iq.vercel.app')).toBeNull();
    expect(googlePopupOrigin(origin)).toBe(origin);
  });
});
