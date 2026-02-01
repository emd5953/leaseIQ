import { Request, Response, NextFunction } from 'express';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex (basic)
const URL_REGEX = /^https?:\/\/.+/i;

// Blocked disposable email domains (common abuse vectors)
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
];

/**
 * Validate email format and block disposable emails
 */
export function validateEmail(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  
  if (email) {
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.some(d => domain?.includes(d))) {
      return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
    }
  }
  
  next();
}

/**
 * Validate URL format for URL-based endpoints
 */
export function validateUrl(field: string = 'imageUrl') {
  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.body[field];
    
    if (url && !URL_REGEX.test(url)) {
      return res.status(400).json({ error: `Invalid URL format for ${field}` });
    }
    
    // Block internal/localhost URLs to prevent SSRF
    if (url) {
      const lowerUrl = url.toLowerCase();
      if (
        lowerUrl.includes('localhost') ||
        lowerUrl.includes('127.0.0.1') ||
        lowerUrl.includes('0.0.0.0') ||
        lowerUrl.includes('169.254.') ||
        lowerUrl.includes('10.') ||
        lowerUrl.includes('192.168.') ||
        lowerUrl.match(/172\.(1[6-9]|2[0-9]|3[0-1])\./)
      ) {
        return res.status(400).json({ error: 'Internal URLs are not allowed' });
      }
    }
    
    next();
  };
}

/**
 * Validate MongoDB ObjectId format
 */
export function validateObjectId(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const param = req.params[paramName];
    const id = Array.isArray(param) ? param[0] : param;
    
    if (id && !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    next();
  };
}

/**
 * Sanitize request body - strip potentially dangerous fields
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (!key.startsWith('$') && !key.startsWith('__')) {
        sanitized[key] = value;
      }
    }
    req.body = sanitized;
  }
  
  next();
}

/**
 * Limit request body size for JSON endpoints
 */
export function limitBodySize(maxSizeKB: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers['content-length'];
    const contentLength = parseInt(Array.isArray(header) ? header[0] : header || '0', 10);
    
    if (contentLength > maxSizeKB * 1024) {
      return res.status(413).json({ error: `Request body too large (max ${maxSizeKB}KB)` });
    }
    
    next();
  };
}
