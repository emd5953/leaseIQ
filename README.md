# LeaseIQ

AI-powered apartment hunting and lease analysis platform.

## Overview

LeaseIQ helps renters find the best deals and make informed decisions through three phases:

### Phase 1: Discovery
- Aggregate listings from StreetEasy, Zillow, Craigslist, Facebook Marketplace
- Dedupe and score listings by value
- Filter scams and surface best deals

### Phase 2: Due Diligence
- Scrape landlord reviews and HPD violations
- Extract and analyze lease terms from PDFs
- Parse floorplan dimensions and layouts

### Phase 3: Report Generation
- AI-synthesized analysis of deal quality, risks, and red flags
- Comprehensive email reports via Resend

## Tech Stack

- **Scraping**: Firecrawl
- **Document Processing**: Reducto
- **AI Analysis**: Open Router
- **Email**: Resend
- **Backend**: Node.js/Express
- **Database**: PostgreSQL
- **Frontend**: React

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

See `.env.example` for required API keys.
