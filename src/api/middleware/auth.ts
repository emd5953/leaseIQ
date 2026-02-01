import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Middleware to verify JWT token and attach user info to request
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth - attaches user info if token present, but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch {
      // Token invalid, but that's okay for optional auth
    }
  }

  next();
}

/**
 * Generate JWT token for a user
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email }, 
    config.jwt.secret, 
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}
