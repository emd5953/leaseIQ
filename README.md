# LeaseIQ - NYC Apartment Rental Platform

Intelligent apartment search platform with automated listing scraping, AI-powered lease analysis, and personalized recommendations.

## Quick Start

### Production (All Services)
```bash
npm start
```

This starts:
- Backend API (port 3001)
- Scraper Cron (every 15 minutes)

Then start frontend:
```bash
cd frontend && npm run dev
```

### Development
```bash
# Backend only
npm run start:backend

# Scraper only
npm run start:scraper

# Frontend only
cd frontend && npm run dev
```

## Features

### 🏢 Automated Listing Scraping
- **13 rental sites**: StreetEasy, Zillow, Apartments.com, Trulia, Realtor, Zumper, RentHop, Rent.com, HotPads, ApartmentGuide, Rentals.com, ApartmentList, PadMapper
- **NYC focused**: Manhattan, Brooklyn, Queens
- **Runs every 15 minutes**: Automatic background job
- **100+ listings per run**: Parallel processing for speed
- **Smart deduplication**: Merges listings from multiple sources

### 🔍 Intelligent Search
- Advanced filtering (price, bedrooms, location, amenities)
- Saved searches with email alerts
- Personalized recommendations
- Map-based search with geocoding

### 📄 AI Lease Analysis
- PDF lease upload and parsing (Reducto)
- AI-powered analysis (OpenRouter)
- Key terms extraction
- Risk assessment
- Email delivery (Resend)

### 🎯 User Features
- Custom search profiles
- Email alerts for new listings
- Listing interactions tracking
- Preference-based recommendations

## Architecture

### Services
1. **Backend API** (`src/server.ts`) - Express REST API
2. **Scraper Cron** (`src/jobs/scraping-cron.ts`) - Background scraping job
3. **Frontend** (`frontend/`) - Next.js React app

### Database
- MongoDB Atlas (cloud)
- Collections: listings, users, savedSearches, alertHistory, scrapingJobs

### External APIs
- **Firecrawl**: Web scraping with extraction
- **Google Geocoding**: Address to coordinates
- **Resend**: Email delivery
- **OpenRouter**: AI analysis
- **Reducto**: PDF parsing

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment guide.

### Quick Deploy with PM2
```bash
pm2 start ecosystem.config.js
pm2 logs
```

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Firecrawl
FIRECRAWL_API_KEY=fc-...
FIRECRAWL_API_URL=https://api.firecrawl.dev/v1

# Google
GOOGLE_GEOCODING_API_KEY=...
GOOGLE_PLACES_API_KEY=...

# Email
RESEND_API_KEY=re_...

# AI
OPENROUTER_API_KEY=sk-or-v1-...

# PDF
REDUCTO_API_KEY=...
```

## Performance

### Scraping
- **Speed**: 3-5 minutes per run (37% faster with parallel processing)
- **Volume**: 100+ listings per run
- **Frequency**: Every 15 minutes
- **Efficiency**: 3 sources in parallel, 10 listings per batch

### API
- **Response time**: <100ms for search queries
- **Database**: Indexed for fast queries
- **Caching**: Ready for Redis integration

## Documentation

- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](docs/API.md)
- [Frontend Guide](docs/FRONTEND_GUIDE.md)
- [Quick Reference](docs/QUICK_REFERENCE.md)

## Scripts

```bash
# Production
npm start                 # Start API + Scraper
pm2 start ecosystem.config.js  # PM2 production

# Development
npm run start:backend     # API only
npm run start:scraper     # Scraper only
npm run scrape           # Manual one-time scrape

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Scraping**: Firecrawl API
- **AI**: OpenRouter (GPT-4)
- **Email**: Resend
- **PDF**: Reducto
- **Deployment**: PM2, Docker, Vercel/Railway

## License

ISC
