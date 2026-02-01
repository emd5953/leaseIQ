import { Router, Request, Response } from 'express';
import { User, UserPreferences, ListingInteraction, SavedSearch, Listing } from '../../models';
import { Types } from 'mongoose';
import { getUserIdFromToken } from './auth.routes';

const router = Router();

// Middleware to get user from token
async function getUser(req: Request, res: Response): Promise<any> {
  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  return user;
}

/**
 * GET /api/user/preferences
 * Get user preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    let prefs = await UserPreferences.findOne({ userId: user._id });
    
    if (!prefs) {
      // Create default preferences
      prefs = await UserPreferences.create({ userId: user._id });
    }

    res.json(prefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/user/preferences
 * Update user preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const prefs = await UserPreferences.findOneAndUpdate(
      { userId: user._id },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(prefs);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /api/user/liked
 * Get user's liked/saved listings
 */
router.get('/liked', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const interactions = await ListingInteraction.find({
      userId: user._id,
      interactionType: 'saved',
    }).sort({ timestamp: -1 });

    const listingIds = interactions.map((i) => i.listingId);
    const listings = await Listing.find({ _id: { $in: listingIds } });

    // Maintain order from interactions
    const listingMap = new Map(listings.map((l) => [l._id.toString(), l]));
    const orderedListings = listingIds
      .map((id) => listingMap.get(id.toString()))
      .filter(Boolean);

    res.json(orderedListings);
  } catch (error) {
    console.error('Get liked listings error:', error);
    res.status(500).json({ error: 'Failed to get liked listings' });
  }
});

/**
 * POST /api/user/like/:listingId
 * Like/save a listing
 */
router.post('/like/:listingId', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { listingId } = req.params;
    const { notes } = req.body;

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Create or update interaction
    await ListingInteraction.findOneAndUpdate(
      {
        userId: user._id,
        listingId: new Types.ObjectId(listingId as string),
        interactionType: 'saved',
      },
      {
        $set: {
          timestamp: new Date(),
          'metadata.notes': notes || null,
        },
      },
      { upsert: true }
    );

    res.json({ success: true, message: 'Listing saved' });
  } catch (error) {
    console.error('Like listing error:', error);
    res.status(500).json({ error: 'Failed to save listing' });
  }
});

/**
 * DELETE /api/user/like/:listingId
 * Unlike/unsave a listing
 */
router.delete('/like/:listingId', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { listingId } = req.params;

    await ListingInteraction.deleteOne({
      userId: user._id,
      listingId: new Types.ObjectId(listingId as string),
      interactionType: 'saved',
    });

    res.json({ success: true, message: 'Listing removed from saved' });
  } catch (error) {
    console.error('Unlike listing error:', error);
    res.status(500).json({ error: 'Failed to remove listing' });
  }
});


/**
 * GET /api/user/saved-searches
 * Get user's saved searches
 */
router.get('/saved-searches', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const searches = await SavedSearch.find({ userId: user._id, isActive: true })
      .sort({ createdAt: -1 });

    // Get count of new listings for each search
    const searchesWithCounts = await Promise.all(
      searches.map(async (search) => {
        const query: any = {};
        const c = search.criteria;

        if (c.minPrice) query['price.amount'] = { $gte: c.minPrice };
        if (c.maxPrice) query['price.amount'] = { ...query['price.amount'], $lte: c.maxPrice };
        if (c.minBedrooms) query.bedrooms = { $gte: c.minBedrooms };
        if (c.maxBedrooms) query.bedrooms = { ...query.bedrooms, $lte: c.maxBedrooms };
        if (c.neighborhoods?.length) query['address.neighborhood'] = { $in: c.neighborhoods };
        if (c.requiresDogsAllowed) query['petPolicy.dogsAllowed'] = true;
        if (c.requiresCatsAllowed) query['petPolicy.catsAllowed'] = true;
        if (c.noFeeOnly) query['brokerFee.required'] = false;

        if (search.lastAlertSentAt) {
          query.createdAt = { $gt: search.lastAlertSentAt };
        }

        const newCount = await Listing.countDocuments(query);

        return {
          ...search.toObject(),
          newListingsCount: newCount,
        };
      })
    );

    res.json(searchesWithCounts);
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to get saved searches' });
  }
});

/**
 * POST /api/user/saved-searches
 * Create a new saved search
 */
router.post('/saved-searches', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, criteria, alertsEnabled, alertFrequency, alertMethod } = req.body;

    const search = await SavedSearch.create({
      userId: user._id,
      name,
      criteria: criteria || {},
      alertsEnabled: alertsEnabled ?? true,
      alertFrequency: alertFrequency || 'daily',
      alertMethod: alertMethod || 'email',
    });

    res.status(201).json(search);
  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

/**
 * DELETE /api/user/saved-searches/:id
 * Delete a saved search
 */
router.delete('/saved-searches/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const result = await SavedSearch.deleteOne({
      _id: new Types.ObjectId(id as string),
      userId: user._id,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Saved search not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

/**
 * GET /api/user/stats
 * Get user dashboard stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const [savedCount, searchCount, viewedCount] = await Promise.all([
      ListingInteraction.countDocuments({ userId: user._id, interactionType: 'saved' }),
      SavedSearch.countDocuments({ userId: user._id, isActive: true, alertsEnabled: true }),
      ListingInteraction.countDocuments({ userId: user._id, interactionType: 'viewed' }),
    ]);

    // Count new matches across all saved searches
    const searches = await SavedSearch.find({ userId: user._id, isActive: true });
    let newMatches = 0;

    for (const search of searches) {
      if (search.lastAlertSentAt) {
        const query: any = { createdAt: { $gt: search.lastAlertSentAt } };
        const c = search.criteria;
        if (c.minPrice) query['price.amount'] = { $gte: c.minPrice };
        if (c.maxPrice) query['price.amount'] = { ...query['price.amount'], $lte: c.maxPrice };
        if (c.minBedrooms) query.bedrooms = { $gte: c.minBedrooms };
        if (c.maxBedrooms) query.bedrooms = { ...query.bedrooms, $lte: c.maxBedrooms };
        newMatches += await Listing.countDocuments(query);
      }
    }

    res.json({
      savedListings: savedCount,
      activeAlerts: searchCount,
      newMatches,
      viewedListings: viewedCount,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
