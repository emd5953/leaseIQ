import { Router, Request, Response } from 'express';
import { SearchService, SearchFilters, SearchOptions } from '../../services/search.service';
import { validateObjectId } from '../middleware/validation';
const router = Router();
export function parseSearchQuery(query: Request['query']): { filters: SearchFilters; options: SearchOptions } {
  const number = (key: string, max = 1000000, integer = false): number | undefined => {
    const value = query[key];
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string') throw new Error(`Invalid ${key}`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) throw new Error(`Invalid ${key}`);
    return n;
  };
  const list = (key: string) => {
    if (query[key] === undefined) return undefined;
    if (typeof query[key] !== 'string' || query[key].length > 500) throw new Error(`Invalid ${key}`);
    return query[key].split(',').map(s => s.trim()).filter(Boolean);
  };
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 160)) throw new Error('Search text is too long');
  const filters: SearchFilters = { q: query.q as string | undefined,
    minPrice: number('minPrice'), maxPrice: number('maxPrice'), minBedrooms: number('minBedrooms', 20, true), maxBedrooms: number('maxBedrooms', 20, true),
    minBathrooms: number('minBathrooms', 20), maxBathrooms: number('maxBathrooms', 20),
    minSquareFeet: number('minSquareFeet', 100000), maxSquareFeet: number('maxSquareFeet', 100000),
    neighborhoods: list('neighborhoods'), amenities: list('amenities'), petsAllowed: query.petsAllowed === 'true', noFee: query.noFee === 'true',
  };
  for (const [min, max] of [[filters.minPrice, filters.maxPrice], [filters.minBedrooms, filters.maxBedrooms], [filters.minBathrooms, filters.maxBathrooms], [filters.minSquareFeet, filters.maxSquareFeet]]) {
    if (min != null && max != null && min > max) throw new Error('Minimum must not exceed maximum');
  }
  const page = number('page', 10000, true) ?? 1;
  const limit = number('limit', 100, true) ?? 20;
  if (page < 1 || limit < 1) throw new Error('Page and limit must be positive');
  if (query.sortBy && !['price', 'bedrooms', 'createdAt'].includes(String(query.sortBy))) throw new Error('Invalid sort field');
  if (query.sortOrder && !['asc', 'desc'].includes(String(query.sortOrder))) throw new Error('Invalid sort order');
  return { filters, options: { page, limit, sortBy: (query.sortBy as SearchOptions['sortBy']) || 'createdAt', sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc' } };
}
router.get('/', async (req: Request, res: Response) => {
  let parsed;
  try { parsed = parseSearchQuery(req.query); } catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  try {
    const result = await SearchService.search(parsed.filters, parsed.options);
    res.set('Cache-Control', 'no-store').json(result);
  } catch { res.status(503).json({ error: 'Listing search is temporarily unavailable. Please retry or research an address directly.' }); }
});
router.get('/recent', async (req: Request, res: Response) => {
  try { const { options } = parseSearchQuery(req.query); res.json({ listings: await SearchService.getRecentListings(options.limit) }); }
  catch { res.status(400).json({ error: 'Unable to load recent listings. Check the limit and retry.' }); }
});
router.get('/:id', validateObjectId('id'), async (req: Request, res: Response) => {
  try {
    const listing = await SearchService.getListingById(String(req.params.id));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch { res.status(503).json({ error: 'Listing is temporarily unavailable' }); }
});
export default router;
