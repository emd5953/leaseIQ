import { Router, Request, Response } from 'express';
import { User } from '../../models';
import crypto from 'crypto';

const router = Router();

// Simple token generation (in production, use JWT)
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// In-memory token store (in production, use Redis or store in DB)
const tokens = new Map<string, string>(); // token -> oderId

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      displayName: displayName || null,
    });
    user.setPassword(password);
    await user.save();

    // Generate token
    const token = generateToken();
    tokens.set(token, user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.validatePassword(password)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken();
    tokens.set(token, user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    tokens.delete(token);
  }
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const oderId = tokens.get(token);
    if (!oderId) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const user = await User.findById(oderId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Export token validation for use in other routes
export function getUserIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const cleanToken = token.replace('Bearer ', '');
  return tokens.get(cleanToken) || null;
}

export default router;
