import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../frontend/src/lib/api';
afterEach(() => vi.unstubAllGlobals());
describe('Frontend API recovery', () => {
  it('turns a proxy HTML outage into an actionable search error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api.searchListings()).rejects.toThrow('temporarily unavailable');
  });
  it('preserves useful validation errors from the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Minimum must not exceed maximum' }, { status: 400 })));
    await expect(api.searchListings({ minPrice: 4000, maxPrice: 1000 })).rejects.toThrow('Minimum must not exceed maximum');
  });
  it('rejects incomplete success payloads instead of rendering fake empty results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})));
    await expect(api.searchListings()).rejects.toThrow('incomplete results');
  });
});

describe('Authenticated document and alert requests', () => {
  function session() {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: () => 'test-session' });
  }
  const document = () => new File(['fictional'], 'test.pdf', { type: 'application/pdf' });
  it('attaches the session to multipart uploads without overriding the boundary', async () => {
    session();
    const fetcher = vi.fn().mockResolvedValue(Response.json({ analysis: { summary: 'Test', keyTerms: {} } }));
    vi.stubGlobal('fetch', fetcher);
    await api.uploadProperty(document(), null);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('/api/lease/upload');
    expect(options.headers).toEqual({ Authorization: 'Bearer test-session' });
    expect(options.body.get('file').name).toBe('test.pdf');
    expect(options.body.has('email')).toBe(false);
  });
  it('preserves the lease and floor plan when normalizing combined reports', async () => {
    session();
    const fetcher = vi.fn().mockResolvedValue(Response.json({ analysis: { lease: { summary: 'Lease', keyTerms: { monthlyRent: '$3200' } }, floorPlan: { layout: { bedrooms: 1 } } } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await api.uploadProperty(document(), new File(['image'], 'plan.png', { type: 'image/png' }));
    expect(result.analysis).toMatchObject({ summary: 'Lease', keyTerms: { monthlyRent: '$3200' }, floorPlan: { layout: { bedrooms: 1 } } });
    expect(fetcher.mock.calls[0][0]).toBe('/api/property/analyze');
  });
  it('gives actionable errors for signed-out, expired and unavailable uploads', async () => {
    await expect(api.uploadProperty(document(), null)).rejects.toThrow('Sign in');
    session();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(api.uploadProperty(document(), null)).rejects.toThrow('session expired');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>outage</html>', { status: 502 })));
    await expect(api.uploadProperty(document(), null)).rejects.toThrow('temporarily unavailable');
  });
  it('never reports a failed test email as successful, including older HTTP 200 responses', async () => {
    session();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, error: 'No matching listings found' })));
    await expect(api.testSavedSearchAlert('id')).rejects.toThrow('No matching listings');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Email delivery is not configured.' }, { status: 400 })));
    await expect(api.testSavedSearchAlert('id')).rejects.toThrow('not configured');
  });
});
