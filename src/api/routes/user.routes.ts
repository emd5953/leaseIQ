import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { UserPreferences } from '../../models/userPreferences.model';
import { ListingInteraction } from '../../models/listingInteraction.model';
import { SavedSearch } from '../../models/savedSearch.model';
import { Listing } from '../../models/listing.model';
import { AlertService } from '../../services/alert.service';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============ PREFERENCES ============

/**
 * GET /api/user/preferences
 * Get user's listing preferences
 */
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    res.json(preferences || { userId: req.userId });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/user/preferences
 * Update user's listing preferences
 */
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const updateData = { ...req.body, userId: new Types.ObjectId(req.userId) };
    delete updateData._id;

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: req.userId },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ============ LIKED/SAVED LISTINGS ============

/**
 * GET /api/user/saved-listings
 * Get user's saved/liked listings
 */
router.get('/saved-listings', async (req: AuthRequest, res: Response) => {
  try {
    const interactions = await ListingInteraction.find({
      userId: req.userId,
      interactionType: 'saved',
    })
      .sort({ timestamp: -1 })
      .lean();

    // Get the actual listing data
    const listingIds = interactions.map((i) => i.listingId);
    const listings = await Listing.find({ _id: { $in: listingIds } }).lean();

    // Map listings with interaction metadata
    const listingsMap = new Map(listings.map((l) => [l._id.toString(), l]));
    const result = interactions.map((interaction) => ({
      ...listingsMap.get(interaction.listingId.toString()),
      savedAt: interaction.timestamp,
      notes: interaction.metadata?.notes,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get saved listings error:', error);
    res.status(500).json({ error: 'Failed to get saved listings' });
  }
});

/**
 * POST /api/user/saved-listings/:listingId
 * Save/like a listing
 */
router.post('/saved-listings/:listingId', async (req: AuthRequest, res: Response) => {
  try {
    const { listingId } = req.params;
    const { notes } = req.body;

    // Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Create or update interaction
    const interaction = await ListingInteraction.findOneAndUpdate(
      {
        userId: req.userId,
        listingId: new Types.ObjectId(listingId as string),
        interactionType: 'saved',
      },
      {
        userId: req.userId,
        listingId: new Types.ObjectId(listingId as string),
        interactionType: 'saved',
        timestamp: new Date(),
        metadata: { notes: notes || null, viewDurationSeconds: null },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, interaction });
  } catch (error) {
    console.error('Save listing error:', error);
    res.status(500).json({ error: 'Failed to save listing' });
  }
});

/**
 * DELETE /api/user/saved-listings/:listingId
 * Remove a saved listing
 */
router.delete('/saved-listings/:listingId', async (req: AuthRequest, res: Response) => {
  try {
    const { listingId } = req.params;

    await ListingInteraction.deleteOne({
      userId: req.userId,
      listingId: new Types.ObjectId(listingId as string),
      interactionType: 'saved',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove saved listing error:', error);
    res.status(500).json({ error: 'Failed to remove saved listing' });
  }
});


// ============ SAVED SEARCHES WITH ALERTS ============

/**
 * GET /api/user/saved-searches
 * Get user's saved searches
 */
router.get('/saved-searches', async (req: AuthRequest, res: Response) => {
  try {
    const searches = await SavedSearch.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(searches);
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to get saved searches' });
  }
});

/**
 * POST /api/user/saved-searches
 * Create a new saved search with alert settings
 */
router.post('/saved-searches', async (req: AuthRequest, res: Response) => {
  try {
    const { name, criteria, alertsEnabled, alertFrequency, alertMethod } = req.body;

    if (!name || !criteria) {
      return res.status(400).json({ error: 'Name and criteria are required' });
    }

    const savedSearch = new SavedSearch({
      userId: new Types.ObjectId(req.userId),
      name,
      criteria,
      alertsEnabled: alertsEnabled ?? false,
      alertFrequency: alertFrequency || 'daily',
      alertMethod: alertMethod || 'email',
      isActive: true,
    });

    await savedSearch.save();
    res.status(201).json(savedSearch);
  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

/**
 * PUT /api/user/saved-searches/:id
 * Update a saved search
 */
router.put('/saved-searches/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.userId;

    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json(savedSearch);
  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

/**
 * DELETE /api/user/saved-searches/:id
 * Delete a saved search
 */
router.delete('/saved-searches/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await SavedSearch.deleteOne({ _id: id, userId: req.userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

/**
 * POST /api/user/saved-searches/:id/test-alert
 * Send a test alert for a saved search
 */
router.post('/saved-searches/:id/test-alert', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const savedSearch = await SavedSearch.findOne({ _id: id, userId: req.userId });
    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const result = await AlertService.sendImmediateAlert(id as string);
    res.json(result);
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});

/**
 * GET /api/user/check-listing/:listingId
 * Check if a listing is saved by the user
 */
router.get('/check-listing/:listingId', async (req: AuthRequest, res: Response) => {
  try {
    const { listingId } = req.params;

    const interaction = await ListingInteraction.findOne({
      userId: req.userId,
      listingId: new Types.ObjectId(listingId as string),
      interactionType: 'saved',
    });

    res.json({ isSaved: !!interaction });
  } catch (error) {
    console.error('Check listing error:', error);
    res.status(500).json({ error: 'Failed to check listing status' });
  }
});

export default router;
