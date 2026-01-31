# LeaseIQ - Quick Start Guide

Get LeaseIQ running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- API keys (see below)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment Variables

Copy and update `.env` with your API keys:

```env
# Required
MONGODB_URI=mongodb+srv://your-connection-string
RESEND_API_KEY=re_your_resend_key
FIRECRAWL_API_KEY=fc_your_firecrawl_key

# For AI features (optional but recommended)
OPENROUTER_API_KEY=sk_your_openrouter_key

# Optional
GOOGLE_GEOCODING_API_KEY=your_google_key
PORT=3000
```

### Get API Keys:

- **MongoDB**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Resend**: [resend.com](https://resend.com) (Free: 100 emails/day)
- **Firecrawl**: [firecrawl.dev](https://firecrawl.dev) (Free tier available)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai) (Pay per use, ~$0.001/request)

## 3. Run the System

### Option A: Run Everything (Recommended for Testing)

Terminal 1 - API Server:
```bash
npm run dev
```

Terminal 2 - Alert Cron Job:
```bash
npm run alerts
```

### Option B: Run Individual Components

**Just the API:**
```bash
npm run dev
```

**Just scraping:**
```bash
npm run scrape
```

**Just alerts:**
```bash
npm run alerts
```

## 4. Test the API

### Search for listings:
```bash
curl "http://localhost:3000/api/search?minPrice=2000&maxPrice=3500&minBedrooms=2"
```

### Get recent listings:
```bash
curl "http://localhost:3000/api/search/recent"
```

### Health check:
```bash
curl "http://localhost:3000/health"
```

## 5. Create Test Data

First, run the scraper to populate listings:

```bash
npm run scrape
```

This will scrape listings from all 5 sources and store them in MongoDB.

## 6. Set Up Alerts

To test the alert system, you need to create a user and saved search in MongoDB:

```javascript
// Connect to MongoDB and run this
use leaseiq;

// Create a test user
db.users.insertOne({
  supabaseId: "test-user-123",
  email: "your-email@example.com",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a saved search
db.savedsearches.insertOne({
  userId: db.users.findOne({ supabaseId: "test-user-123" })._id,
  name: "2BR in Williamsburg",
  criteria: {
    minPrice: 2000,
    maxPrice: 3500,
    minBedrooms: 2,
    maxBedrooms: 2,
    neighborhoods: ["Williamsburg"],
    petsAllowed: true,
    noFee: true
  },
  isActive: true,
  alertFrequency: "instant",
  alertMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Now when you run `npm run alerts`, it will check for matching listings and send an email!

## 7. Test Research & Lease Analysis

### Research a listing:
```bash
curl -X POST "http://localhost:3000/api/research/LISTING_ID_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Analyze a lease:
```bash
curl -X POST "http://localhost:3000/api/lease/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "leaseText": "This lease agreement is made between...",
    "email": "your-email@example.com"
  }'
```

## Common Issues

### "MongoDB connection failed"
- Check your `MONGODB_URI` is correct
- Ensure your IP is whitelisted in MongoDB Atlas

### "Email send failed"
- Verify `RESEND_API_KEY` is correct
- Check you haven't exceeded free tier limits (100/day)

### "No listings found"
- Run `npm run scrape` first to populate the database
- Check MongoDB has data: `db.listings.countDocuments()`

### "OpenRouter API error"
- Verify `OPENROUTER_API_KEY` is set
- Ensure you have credits in your OpenRouter account

## Production Deployment

For production, you'll want to:

1. **Build the TypeScript:**
   ```bash
   npm run build
   npm start
   ```

2. **Use PM2 or similar for process management:**
   ```bash
   pm2 start dist/server.js --name leaseiq-api
   pm2 start dist/jobs/alert-cron.js --name leaseiq-alerts
   ```

3. **Set up proper environment variables** in your hosting platform

4. **Configure a reverse proxy** (nginx) for the API

5. **Set up monitoring** and logging

## Next Steps

- Read `API.md` for full API documentation
- Check `README.md` for architecture details
- Review `docs/` for implementation details
- Add authentication (Supabase integration)
- Build a frontend (Next.js recommended)

## Support

Questions? Check the docs or open an issue on GitHub.
