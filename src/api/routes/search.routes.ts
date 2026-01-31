import { Router, Request, Response } from 'express';
import { SearchService } from '../../services/search.service';

const router = Router();

/**
 * GET /api/search
 * Public search endpoint - no auth required
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
      minBedrooms: req.query.minBedrooms ? parseInt(req.query.minBedrooms as string) : undefined,
      maxBedrooms: req.query.maxBedrooms ? parseInt(req.query.maxBedrooms as string) : undefined,
      minBathrooms: req.query.minBathrooms ? parseFloat(req.query.minBathrooms as string) : undefined,
      maxBathrooms: req.query.maxBathrooms ? parseFloat(req.query.maxBathrooms as string) : undefined,
      neighborhoods: req.query.neighborhoods ? (req.query.neighborhoods as string).split(',') : undefined,
      petsAllowed: req.query.petsAllowed === 'true',
      noFee: req.query.noFee === 'true',
      amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,
      minSquareFeet: req.query.minSquareFeet ? parseInt(req.query.minSquareFeet as string) : undefined,
      maxSquareFeet: req.query.maxSquareFeet ? parseInt(req.query.maxSquareFeet as string) : undefined,
    };

    const options = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: (req.query.sortBy as 'price' | 'bedrooms' | 'createdAt') || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await SearchService.search(filters, options);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/search/recent
 * Get recent listings
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const listings = await SearchService.getRecentListings(limit);
    res.json({ listings });
  } catch (error) {
    console.error('Recent listings error:', error);
    res.status(500).json({ error: 'Failed to fetch recent listings' });
  }
});

/**
 * GET /api/search/:id
 * Get listing by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const listing = await SearchService.getListingById(id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

export default router;
