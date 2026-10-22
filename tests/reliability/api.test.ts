import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../../src/api';
import { ResearchService } from '../../src/services/research.service';
import { EmailService } from '../../src/services/email.service';
import { isNYCAddress } from '../../src/utils/nyc';

describe('Public research API with unavailable listing storage', () => {
  let server: Server;
  let origin: string;
  beforeAll(async () => { server = createApp().listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve)); origin = `http://127.0.0.1:${(server.address() as any).port}`; });
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const post = (url: string, body: unknown) => fetch(`${origin}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  it('returns useful search downtime without fabricating an empty result set', async () => {
    const response = await fetch(`${origin}/api/search`);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('research');
  });
  it('validates address input before accessing sources', async () => {
    const spy = vi.spyOn(ResearchService, 'researchAddress');
    try { expect((await post('/api/research/address', { street: '', borough: 'Boston' })).status).toBe(400); expect(spy).not.toHaveBeenCalled(); }
    finally { spy.mockRestore(); }
  });
  it('serves address research without an account or listing database', async () => {
    const spy = vi.spyOn(ResearchService, 'researchAddress').mockResolvedValue({ version: 2, address: '230 West 55 Street, Manhattan', match: { status: 'matched' } } as any);
    try {
      const response = await post('/api/research/address', { street: '230 West 55 Street', borough: 'Manhattan' });
      expect(response.status).toBe(200);
      expect((await response.json()).research.match.status).toBe('matched');
      expect(response.headers.get('cache-control')).toBe('no-store');
    } finally { spy.mockRestore(); }
  });
  it('keeps report email authenticated and does not attempt a send', async () => {
    const spy = vi.spyOn(ResearchService, 'sendResearchReport');
    try {
      expect((await post('/api/research/507f1f77bcf86cd799439011', { email: 'test@example.com' })).status).toBe(401);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it('responds promptly when an existing listing cannot be read', async () => {
    expect((await post('/api/research/507f1f77bcf86cd799439011', {})).status).toBe(503);
  });
});

describe('Evidence retention in exported reports', () => {
  it('retains sources, gaps, and source dates while escaping source text', async () => {
    const send = vi.spyOn(EmailService, 'send').mockResolvedValue({ success: true });
    try {
      await EmailService.sendResearchReport('test@example.com', { address: 'Example' }, {
        version: 2, address: '<script>alert(1)</script>', generatedAt: '2026-10-22', match: { status: 'matched' }, summary: 'Summary',
        sections: [{ title: 'Building', facts: [{ label: 'Owner', value: '<b>Example</b>', sourceIds: ['pluto'] }], analysis: [], unknowns: ['Reputation not verified'], questions: ['Ask about repairs'] }],
        sources: [{ id: 'pluto', name: 'PLUTO', url: 'https://data.cityofnewyork.us/', status: 'available', retrievedAt: '2026-10-22', datasetUpdatedAt: '2026-08-24', detail: 'Retrieved' }], limitations: ['Building records may lag.'],
      } as any);
      const html = send.mock.calls[0][0].html;
      expect(html).toContain('2026-08-24');
      expect(html).toContain('Reputation not verified');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    } finally { send.mockRestore(); }
  });
});

describe('NYC scope', () => {
  it('does not treat all of New York State, nearby ZIP ranges, or the city bounding box as NYC', () => {
    expect(isNYCAddress({ city: 'Albany', state: 'NY' })).toBe(false);
    expect(isNYCAddress({ city: 'Jersey City', state: 'NJ' }, { latitude: 40.71, longitude: -74.04 })).toBe(false);
    expect(isNYCAddress({ city: 'New York Mills', state: 'NY' })).toBe(false);
    expect(isNYCAddress({ city: 'Brooklyn', state: 'NY' })).toBe(true);
    expect(isNYCAddress({ city: 'Manhattan', state: 'NY' }, { latitude: 42, longitude: -73.98 })).toBe(false);
  });
});
