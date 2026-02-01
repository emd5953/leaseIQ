import { Router, Request, Response } from 'express';
import { User } from '../../models';

const router = Router();

/**
 * POST /api/auth/sync
 * Sync Supabase user to MongoDB after authentication
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { supabaseId, email, displayName } = req.body;

    if (!supabaseId || !email) {
      res.status(400).json({ error: 'supabaseId and email are required' });
      return;
    }

    // Find or create user
    let user = await User.findOne({ supabaseId });

    if (user) {
      // Update existing user
      user.email = email;
      user.displayName = displayName || user.displayName;
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        supabaseId,
        email,
        displayName: displayName || null,
        lastLoginAt: new Date(),
      });
    }

    res.json({
      id: user._id,
      supabaseId: user.supabaseId,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

/**
 * GET /api/auth/me
 * Get current user by Supabase ID (passed in header)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const supabaseId = req.headers['x-supabase-id'] as string;

    if (!supabaseId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findOne({ supabaseId });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      supabaseId: user.supabaseId,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
