# Render Setup Guide - Deploy Cron Jobs

## Current Status
- ✅ API service deployed (`leaseiq-api`)
- ❌ Scraping cron job NOT deployed
- ❌ Alerts cron job NOT deployed

## Why Scraping Isn't Working
You only have 1 service deployed. The `render.yaml` defines 3 services, but Render hasn't created the cron jobs yet.

## Solution: Deploy Using Blueprint

### Step 1: Deploy from render.yaml (Easiest Method)

1. **Go to Render Dashboard:** https://dashboard.render.com/

2. **Click "New +" button** (top right)

3. **Select "Blueprint"**

4. **Connect your GitHub repository**
   - If already connected, select it
   - If not, authorize GitHub access

5. **Render will read your `render.yaml`** and show:
   - ✅ leaseiq-api (already exists - will skip)
   - 🆕 leaseiq-scraping (new cron job)
   - 🆕 leaseiq-alerts (new cron job)

6. **Click "Apply"**

7. **Set environment variables** for the new services:
   
   For `leaseiq-scraping`:
   - `MONGODB_URI` = (your MongoDB connection string)
   - `FIRECRAWL_API_KEY` = (your Firecrawl key)
   - `NODE_ENV` = production
   
   For `leaseiq-alerts`:
   - `MONGODB_URI` = (your MongoDB connection string)
   - `RESEND_API_KEY` = (your Resend key)
   - `NODE_ENV` = production

8. **Deploy!**

### Step 2: Verify Deployment

After deployment, you should see **3 services** in your dashboard:

1. **leaseiq-api** (Web Service)
   - Type: Web Service
   - Status: Live
   - URL: https://leaseiq.onrender.com

2. **leaseiq-scraping** (Cron Job)
   - Type: Cron Job
   - Schedule: Every 6 hours (0 */6 * * *)
   - Last Run: (should show timestamp)

3. **leaseiq-alerts** (Cron Job)
   - Type: Cron Job
   - Schedule: Every 15 minutes (*/15 * * * *)
   - Last Run: (should show timestamp)

### Step 3: Manually Trigger First Run

For each cron job:

1. Click on the service name
2. Click **"Trigger Run"** or **"Manual Deploy"**
3. Watch the logs to see if it works

## Alternative: Manual Creation (If Blueprint Doesn't Work)

### Create Scraping Cron Job

1. Click **"New +"** → **"Cron Job"**

2. **Settings:**
   - Name: `leaseiq-scraping`
   - Region: Same as your API
   - Branch: `main` (or your default branch)
   - Root Directory: Leave blank
   - Runtime: Node
   - Build Command: `npm ci && npm run build`
   - Start Command: `node dist/jobs/scraping-cron.js`
   - Schedule: `0 */6 * * *`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   NPM_CONFIG_PRODUCTION=false
   MONGODB_URI=<your-mongodb-uri>
   FIRECRAWL_API_KEY=<your-firecrawl-key>
   ```

4. **Create Service**

### Create Alerts Cron Job

1. Click **"New +"** → **"Cron Job"**

2. **Settings:**
   - Name: `leaseiq-alerts`
   - Region: Same as your API
   - Branch: `main`
   - Root Directory: Leave blank
   - Runtime: Node
   - Build Command: `npm ci && npm run build`
   - Start Command: `node dist/jobs/alert-cron.js`
   - Schedule: `*/15 * * * *`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   NPM_CONFIG_PRODUCTION=false
   MONGODB_URI=<your-mongodb-uri>
   RESEND_API_KEY=<your-resend-key>
   ```

4. **Create Service**

## Expected Behavior After Setup

### Scraping Cron (Every 6 Hours)
```
00:00 UTC - Scrape all sources → Add new listings
06:00 UTC - Scrape all sources → Add new listings
12:00 UTC - Scrape all sources → Add new listings
18:00 UTC - Scrape all sources → Add new listings
```

**Logs should show:**
```
Connecting to MongoDB...
✓ MongoDB connected
✓ Scraping cron job scheduled (every 15 minutes)
[timestamp] Running scraping job...
[timestamp] Scraping job complete: {
  totalListingsScraped: X,
  newListingsAdded: Y,
  duplicatesDetected: Z,
  errorsEncountered: 0
}
```

### Alerts Cron (Every 15 Minutes)
```
Runs every 15 minutes
Checks for new listings matching saved searches
Sends emails if matches found
```

**Logs should show:**
```
Connecting to MongoDB...
✓ MongoDB connected
✓ Alert cron job scheduled (every 15 minutes)
[timestamp] Running alert job...
[timestamp] Alert job complete: {
  processed: X,
  sent: Y,
  errors: 0
}
```

## Troubleshooting

### If cron jobs fail to build:
- Check that `dist/jobs/scraping-cron.js` exists after build
- Verify TypeScript compilation is working
- Check build logs for errors

### If cron jobs fail to run:
- Check environment variables are set correctly
- Verify MongoDB connection string is correct
- Check logs for specific error messages

### If scraping runs but finds no listings:
- Check Firecrawl API key is valid
- Check Firecrawl API quota/limits
- Look for rate limiting errors in logs

### If alerts run but send nothing:
- This is normal if no new listings match saved searches
- Create a test saved search to verify
- Check that users have active saved searches

## Cost Considerations

Render Free Tier:
- ✅ 1 Web Service (API) - Free with 750 hours/month
- ✅ Cron Jobs - Free (but limited to 1 job on free tier)

**Note:** You may need to upgrade to run multiple cron jobs, or combine them into one service using `npm start`.

## Quick Test After Setup

Run this to verify everything is working:

```bash
npx tsx tests/verify-cron-jobs.ts
```

This will check:
- ✅ Listings are being added
- ✅ Newest listing age
- ✅ Alert system status
- ✅ Configuration matches

## Summary

**Right now:** Only API is running, no scraping happening

**After setup:** All 3 services running:
1. API serving requests
2. Scraping adding listings every 6 hours
3. Alerts checking every 15 minutes

**Next step:** Use Blueprint to deploy the cron jobs from `render.yaml`
