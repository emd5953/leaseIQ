import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import type { Server } from 'node:http';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/api';
import { generateToken } from '../../src/api/middleware/auth';
import { config, jwtSecret } from '../../src/config';
import { LeaseService } from '../../src/services/lease.service';
import { FloorPlanService } from '../../src/services/floorplan.service';
import { EmailService } from '../../src/services/email.service';
import { isPublicAddress, publicDestination } from '../../src/utils/safe-image';

describe('Authentication, uploads and email boundaries', () => {
  let server: Server;
  let origin: string;
  const token = generateToken(new Types.ObjectId().toHexString(), 'owner@example.com');
  const lease = {
    summary: 'Fixture lease',
    keyTerms: { monthlyRent: '$2100' },
    redFlags: [],
    tenantRights: ['Fixture clause'],
  };
  const plan = {
    summary: 'Fixture plan',
    layout: { bedrooms: 1, bathrooms: 1, totalRooms: 3 },
    features: [],
    pros: [],
    cons: [],
    recommendations: [],
    spaceEfficiency: 'Good',
  };
  const keys = [config.openrouter.apiKey, config.reducto.apiKey];
  beforeAll(async () => {
    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    origin = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    [config.openrouter.apiKey, config.reducto.apiKey] = keys;
    delete process.env.INTERNAL_JOB_TOKEN;
  });
  function form(kind = 'both', email?: string) {
    const f = new FormData();
    if (kind !== 'floor')
      f.append(
        'lease',
        new Blob(['%PDF-1.4\nFixture only\n%%EOF'], { type: 'application/pdf' }),
        'lease.pdf',
      );
    if (kind !== 'lease')
      f.append(
        'floorplan',
        new Blob([Buffer.from('89504e470d0a1a0a0000000049454e44', 'hex')], { type: 'image/png' }),
        'plan.png',
      );
    if (email) {
      f.append('email', email);
      f.append('sendEmail', 'true');
    }
    return f;
  }
  function services() {
    config.openrouter.apiKey = config.reducto.apiKey = 'fixture';
    vi.spyOn(LeaseService, 'analyzeLeasePDF').mockResolvedValue(lease as any);
    vi.spyOn(FloorPlanService, 'analyzeFloorPlan').mockResolvedValue(plan as any);
    return vi
      .spyOn(EmailService, 'sendCombinedAnalysis')
      .mockResolvedValue({ success: false, error: 'Fixture delivery failure' });
  }
  const post = (body: FormData, auth = token, path = '/api/property/analyze') =>
    fetch(origin + path, {
      method: 'POST',
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
      body,
    });
  it('rejects missing, expired, forged-shape, and non-HS256 sessions before processing', async () => {
    services();
    for (const auth of [
      '',
      jwt.sign(
        { userId: '507f1f77bcf86cd799439011', email: 'owner@example.com' },
        config.jwt.secret,
        { expiresIn: -1 },
      ),
      jwt.sign({ role: 'admin' }, config.jwt.secret),
      jwt.sign(
        { userId: '507f1f77bcf86cd799439011', email: 'owner@example.com' },
        config.jwt.secret,
        { algorithm: 'HS384' },
      ),
    ])
      expect((await post(form(), auth)).status).toBe(401);
    expect(LeaseService.analyzeLeasePDF).not.toHaveBeenCalled();
  });
  it.each(['lease', 'floor', 'both'])(
    'preserves the full response contract for %s',
    async (kind) => {
      const send = services();
      const response = await post(form(kind));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.partial).toBe(false);
      expect(data.emailSent).toBe(false);
      if (kind !== 'floor') expect(data.analysis.lease).toEqual(lease);
      if (kind !== 'lease') expect(data.analysis.floorPlan).toEqual(plan);
      expect(send).not.toHaveBeenCalled();
    },
  );
  it('keeps successful analysis when another service fails and supports a retry', async () => {
    services();
    vi.mocked(FloorPlanService.analyzeFloorPlan).mockRejectedValueOnce(new Error('Timeout'));
    const data = await (await post(form())).json();
    expect(data.partial).toBe(true);
    expect(data.analysis.lease).toEqual(lease);
    expect(data.errors.floorPlan).toContain('failed');
    expect((await (await post(form('floor'))).json()).analysis.floorPlan).toEqual(plan);
  });
  it('reports unavailable configuration without invoking paid services', async () => {
    services();
    config.openrouter.apiKey = '';
    expect((await post(form())).status).toBe(503);
    expect(LeaseService.analyzeLeasePDF).not.toHaveBeenCalled();
  });
  it('does not report email success on failure and rejects other recipients on every route', async () => {
    const send = services();
    const result = await (await post(form('both', 'owner@example.com'))).json();
    expect(result.emailSent).toBe(false);
    expect(result.emailError).toContain('failure');
    send.mockClear();
    for (const [path, field] of [
      ['/api/property/analyze', 'lease'],
      ['/api/property/analyze-lease-only', 'lease'],
      ['/api/property/analyze-floorplan-only', 'floorplan'],
      ['/api/lease/upload', 'file'],
      ['/api/floorplan/analyze', 'file'],
    ]) {
      const f = new FormData();
      f.append(field, new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'lease.pdf');
      f.append('email', 'someone@example.com');
      expect((await post(f, token, path)).status).toBe(403);
    }
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects invalid content and oversized uploads with JSON errors', async () => {
    services();
    for (const [content, status] of [
      ['<html>fake PDF</html>', 415],
      ['x'.repeat(10 * 1024 * 1024 + 1), 413],
    ] as const) {
      const f = new FormData();
      f.append('lease', new Blob([content], { type: 'application/pdf' }), 'bad.pdf');
      const response = await post(f);
      expect(response.status).toBe(status);
      expect((await response.json()).error).toBeTruthy();
    }
    expect(LeaseService.analyzeLeasePDF).not.toHaveBeenCalled();
  });
  it('retries email with the original idempotency key and rejects altered or other-account reports', async () => {
    const send = services();
    const result = await (await post(form('both', 'owner@example.com'))).json();
    const email = (analysis = result.analysis, auth = token) =>
      fetch(origin + '/api/property/email', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, receipt: result.receipt }),
      });
    expect((await email({ ...result.analysis, lease: { summary: 'altered' } })).status).toBe(400);
    expect(
      (
        await email(
          result.analysis,
          generateToken(new Types.ObjectId().toHexString(), 'other@example.com'),
        )
      ).status,
    ).toBe(400);
    send.mockResolvedValueOnce({ success: true, messageId: 'fixture' });
    expect((await (await email()).json()).emailSent).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    expect(LeaseService.analyzeLeasePDF).toHaveBeenCalledTimes(1);
  });
  it('emails the complete report after a partial retry without reanalyzing its successful file', async () => {
    const send = services();
    vi.mocked(FloorPlanService.analyzeFloorPlan).mockRejectedValueOnce(new Error('Timeout'));
    const first = await (await post(form('both', 'owner@example.com'))).json();
    const retry = await (await post(form('floor'))).json();
    send.mockResolvedValueOnce({ success: true, messageId: 'fixture' });
    const response = await fetch(origin + '/api/property/email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [first, retry].map((x) => ({ analysis: x.analysis, receipt: x.receipt })),
      }),
    });
    expect((await response.json()).emailSent).toBe(true);
    expect(send.mock.calls[0][1]).toEqual({ lease, floorPlan: plan });
    expect(LeaseService.analyzeLeasePDF).toHaveBeenCalledTimes(1);
  });
  it('does not allow user tokens to process everyone’s alerts', async () => {
    process.env.INTERNAL_JOB_TOKEN = 'i'.repeat(40);
    expect(
      (
        await fetch(origin + '/api/alerts/process', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(origin + '/api/alerts/process', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.INTERNAL_JOB_TOKEN}` },
        })
      ).status,
    ).toBe(503);
  });
});

describe('Production signing and public destination validation', () => {
  it('requires a production signing key and never uses a known development fallback', () => {
    for (const key of [undefined, '', 'short', 'leaseiq-jwt-secret-change-in-production'])
      expect(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: key })).toThrow(/JWT_SECRET/);
    expect(jwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(40) })).toHaveLength(40);
    expect(jwtSecret({})).not.toBe(jwtSecret({}));
  });
  it.each([
    '127.0.0.1',
    '0.0.0.0',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '224.0.0.1',
    '192.0.2.1',
    '198.18.0.1',
    '::1',
    '::',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
    '2002:7f00:1::',
    '64:ff9b::7f00:1',
  ])('blocks %s', (address) => expect(isPublicAddress(address)).toBe(false));
  it('rejects numeric aliases, credentials, mixed private DNS and unsupported protocols', async () => {
    for (const url of [
      'http://2130706433/x',
      'http://0x7f000001/x',
      'http://127.1/x',
      'http://[::ffff:127.0.0.1]/x',
      'file:///etc/hosts',
      'https://user:pass@example.com/x',
      'http://example.com:8080/x',
    ])
      await expect(publicDestination(url)).rejects.toThrow();
    await expect(
      publicDestination(
        'https://example.com/x',
        vi.fn().mockResolvedValue([
          { address: '8.8.8.8', family: 4 },
          { address: '10.0.0.1', family: 4 },
        ]) as any,
      ),
    ).rejects.toThrow(/Internal/);
    expect(
      (
        await publicDestination(
          'https://example.com/x',
          vi.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]) as any,
        )
      ).address.address,
    ).toBe('8.8.8.8');
  });
});
