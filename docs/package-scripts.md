# LeaseIQ Scripts

## Automatic NYC Apartment Scraper

### Start the scraper (runs every 15 minutes)
```bash
node start-scraper.js
```

This will:
- ✅ Scrape NYC apartments from 13 rental sites
- ✅ Run automatically every 15 minutes
- ✅ Target 100+ listings per run
- ✅ Store all listings in MongoDB
- ✅ Handle duplicates automatically
- ✅ Geocode addresses for map features

### Manual scraping (one-time run)
```bash
npx tsx src/ingestion/example.ts
```

### Start full stack
```bash
# Backend (port 3001)
npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

## How It Works

1. **Cron Job**: Runs every 15 minutes (`*/15 * * * *`)
2. **NYC Focus**: Scrapes Manhattan, Brooklyn, Queens listings
3. **13 Sources**: StreetEasy, Zillow, Apartments.com, Trulia, Realtor, Zumper, RentHop, Rent.com, HotPads, ApartmentGuide, Rentals.com, ApartmentList, PadMapper
4. **Parallel Processing**: 3 sources at once, 10 listings per batch
5. **Smart Storage**: Deduplicates, geocodes, and stores in MongoDB
6. **User Experience**: Users only see listings matching their search/profile

## Performance

- **Speed**: ~3-5 minutes per run
- **Volume**: 100+ listings per run
- **Efficiency**: Parallel processing, batch operations
- **Reliability**: Error handling, retry logic, rate limiting
