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
