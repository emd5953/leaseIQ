# Listing Ingestion Pipeline

This module handles the scraping, normalization, and storage of apartment listings from multiple rental platforms.

## Directory Structure

```
src/ingestion/
├── config/           # Configuration management
│   └── index.ts      # Environment variables and validation
├── scrapers/         # Source-specific scrapers
├── services/         # Core services (parser, normalizer, geocoder, etc.)
├── types/            # TypeScript type definitions
│   └── index.ts      # Core interfaces and enums
└── index.ts          # Module entry point
```

## Dependencies

- **@mendable/firecrawl-js**: Web scraping via Firecrawl API
- **mongoose**: MongoDB ODM for data persistence
- **@googlemaps/google-maps-services-js**: Google Maps Geocoding API client
- **bottleneck**: Rate limiting for API requests
- **dotenv**: Environment variable management

## Configuration

All configuration is managed through environment variables. See `.env` file for available options:

- `FIRECRAWL_API_KEY`: API key for Firecrawl service
- `GOOGLE_GEOCODING_API_KEY`: API key for Google Geocoding
- `MONGODB_URI`: MongoDB connection string
- `RATE_LIMIT_FIRECRAWL`: Max requests per minute to Firecrawl (default: 100)
- `RATE_LIMIT_GEOCODING`: Max requests per second to Geocoding API (default: 50)
- `SCRAPING_SCHEDULE`: Cron expression for scheduled jobs (default: every 6 hours)
- `MAX_LISTINGS_PER_SOURCE`: Maximum listings to scrape per source (default: 1000)
- `STALE_LISTING_DAYS`: Days before marking listings as inactive (default: 30)
- `LOG_LEVEL`: Logging level (default: info)

## Usage

```typescript
import { config, validateConfig } from './ingestion';

// Validate configuration on startup
validateConfig();

// Access configuration
console.log(config.firecrawl.apiKey);
```

## Development

The pipeline follows a modular architecture with clear separation of concerns:

1. **Scrapers**: Fetch raw data from sources via Firecrawl
2. **Parser**: Extract structured data from raw responses
3. **Normalizer**: Transform data into unified schema
4. **Geocoder**: Convert addresses to coordinates
5. **Deduplicator**: Identify and merge duplicate listings
6. **Storage**: Persist to MongoDB

See the design document at `.kiro/specs/listing-ingestion-pipeline/design.md` for detailed architecture.
