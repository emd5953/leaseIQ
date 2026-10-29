import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';

if (process.env.NODE_ENV !== 'test') dotenv.config();

export function jwtSecret(env: NodeJS.ProcessEnv): string {
  const secret = env.JWT_SECRET?.trim();
  if (
    env.NODE_ENV === 'production' &&
    (!secret || secret.length < 32 || /change|example|secret-change/i.test(secret))
  ) {
    throw new Error('Production requires JWT_SECRET with at least 32 random characters.');
  }
  return secret || randomBytes(48).toString('hex');
}

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM_EMAIL || '',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  reducto: {
    apiKey: process.env.REDUCTO_API_KEY || '',
  },
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY || '',
    apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1',
  },
  google: {
    geocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY || '',
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  },
  jwt: {
    secret: jwtSecret(process.env),
    expiresIn: '7d',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};
