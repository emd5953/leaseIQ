import * as dotenv from 'dotenv';

dotenv.config();

export interface IngestionConfig {
  firecrawl: {
    apiKey: string;
    apiUrl: string;
    rateLimit: number; // requests per minute
  };
  geocoding: {
    apiKey: string;
    rateLimit: number; // requests per second
  };
  mongodb: {
    uri: string;
  };
  scraping: {
    schedule: string; // cron expression
    maxListingsPerSource: number;
    staleListingDays: number;
  };
  logging: {
    level: string;
  };
}

export const config: IngestionConfig = {
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY || '',
    apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1',
    rateLimit: parseInt(process.env.RATE_LIMIT_FIRECRAWL || '100', 10),
  },
  geocoding: {
    apiKey: process.env.GOOGLE_GEOCODING_API_KEY || '',
    rateLimit: parseInt(process.env.RATE_LIMIT_GEOCODING || '50', 10),
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/leaseiq',
  },
  scraping: {
    schedule: process.env.SCRAPING_SCHEDULE || '0 */6 * * *',
    maxListingsPerSource: parseInt(process.env.MAX_LISTINGS_PER_SOURCE || '1000', 10),
    staleListingDays: parseInt(process.env.STALE_LISTING_DAYS || '30', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.firecrawl.apiKey) {
    errors.push('FIRECRAWL_API_KEY is required');
  }

  if (!config.geocoding.apiKey) {
    errors.push('GOOGLE_GEOCODING_API_KEY is required');
  }

  if (!config.mongodb.uri) {
    errors.push('MONGODB_URI is required');
  }

  if (config.firecrawl.rateLimit <= 0) {
    errors.push('RATE_LIMIT_FIRECRAWL must be greater than 0');
  }

  if (config.geocoding.rateLimit <= 0) {
    errors.push('RATE_LIMIT_GEOCODING must be greater than 0');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
