# Quick Fix Guide - Listing Detail Issue

## Problem Identified ✓

Your backend API is **working perfectly** on Render! The issue is that the frontend's Next.js config was hardcoded to use `localhost:3001` for API rewrites, which doesn't work in production.

## Test Results

✅ Backend health check: PASSED  
✅ Search endpoint: PASSED (127 listings found)  
✅ Listing detail endpoint: PASSED  
⚠️ CORS headers: Not set (but not causing issues)

## Fixes Applied

### 1. Fixed Next.js API Rewrites ✓

**File:** `frontend/next.config.js`

**Changed:** API rewrites now use `NEXT_PUBLIC_API_URL` environment variable instead of hardcoded localhost.

**What this does:** In production, API calls to `/api/*` will now correctly proxy to `https://leaseiq.onrender.com/api/*`

## Deployment Steps

### Step 1: Redeploy Frontend to Vercel

Since we changed `next.config.js`, you need to redeploy:

```bash
cd frontend
git add next.config.js
git commit -m "Fix API rewrites for production"
git push
```

Vercel will automatically redeploy.

### Step 2: Verify Environment Variable on Vercel

Make sure this is set in your Vercel project settings:

```
NEXT_PUBLIC_API_URL=https://leaseiq.onrender.com
```

**How to check:**
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify `NEXT_PUBLIC_API_URL` is set correctly

### Step 3: (Optional) Add FRONTEND_URL to Render

For better CORS security, add this environment variable to your Render backend:

```
FRONTEND_URL=https://lease-iq.vercel.app
```

**How to add:**
1. Go to Render dashboard
2. Select `leaseiq-api` service
3. Go to Environment
4. Add new variable: `FRONTEND_URL` = `https://lease-iq.vercel.app`
5. Save (service will auto-restart)

## Testing After Deployment

Once Vercel redeploys, test by:

1. Go to your deployed site: `https://lease-iq.vercel.app`
2. Click on any listing
3. The listing detail page should now load correctly!

## About the Scraping Job

Your scraping cron job on Render is configured to run **every 6 hours**:
- Schedule: `0 */6 * * *` (midnight, 6am, noon, 6pm UTC)
- It's adding listings to the same MongoDB database
- Currently 127 NYC listings in the database

**To check if it's running:**
1. Go to Render dashboard
2. Find `leaseiq-scraping` cron job
3. Check the logs to see when it last ran

**To make it run more frequently:**
Edit `render.yaml` and change the schedule:
```yaml
schedule: "0 */2 * * *"  # Every 2 hours
# or
schedule: "0 * * * *"    # Every hour
```

Then commit and push to trigger a redeploy.

## Summary

✅ **Backend:** Working perfectly (127 listings available)  
✅ **Fix Applied:** Updated Next.js config to use correct API URL in production  
⏳ **Next Step:** Redeploy frontend to Vercel  
✅ **Scraping:** Running every 6 hours on Render

The listing detail page will work once the frontend is redeployed!
