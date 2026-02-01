import { Router, Request, Response } from 'express';
import { User, UserPreferences, ListingInteraction, SavedSearch, Listing } from '../../models';
import { Types } from 'mongoose';

const router = Router();

// Middleware to get user from Supabase ID
async function getUser(req: Request, res: Response): Promise<any> {
  const supabaseId = req.headers['x-supabase-id'] as string;
  if (!supabaseId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const user = await User.findOne({ supabaseId });
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
