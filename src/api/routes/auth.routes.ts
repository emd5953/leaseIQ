import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../../models/user.model';
import { config } from '../../config';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(
  config.google.oauthClientId,
  config.google.oauthClientSecret,
  'postmessage' // Required for auth-code flow
);

/**
 * POST /api/auth/google
 * Authenticate with Google OAuth ID token (One Tap flow)
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.oauthClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        displayName: name || null,
        passwordHash: 'oauth-user',
        salt: 'oauth',
        lastLoginAt: new Date(),
      });
      await user.save();
    } else {
      user.lastLoginAt = new Date();
      if (name && !user.displayName) {
        user.displayName = name;
      }
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.email);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        picture,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/google/code
 * Authenticate with Google OAuth authorization code (custom button flow)
 */
router.post('/google/code', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    
    if (!tokens.id_token) {
      return res.status(400).json({ error: 'Failed to get ID token' });
    }

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google.oauthClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        displayName: name || null,
        passwordHash: 'oauth-user',
        salt: 'oauth',
        lastLoginAt: new Date(),
      });
      await user.save();
    } else {
      user.lastLoginAt = new Date();
      if (name && !user.displayName) {
        user.displayName = name;
      }
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.email);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        picture,
      },
    });
  } catch (error) {
    console.error('Google auth code error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -salt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
