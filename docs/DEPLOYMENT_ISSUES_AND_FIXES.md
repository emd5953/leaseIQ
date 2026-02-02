# Deployment Issues & Fixes

## Issues Identified

### 1. "Listing not found" Error on Frontend

**Problem:** When clicking on a listing, the frontend shows "This listing may have been removed or is no longer available."

**Root Cause:** The frontend is making API calls to `https://leaseiq.onrender.com/api/search/${id}` but:
- The backend might not be running on Render
- There might be CORS issues
- The API endpoint might be returning 404 or 500 errors

**Evidence:**
- Local testing shows the API works perfectly (166 listings in DB, 127 NYC listings)
- The SearchService.getListingById() function works correctly
- Sample listing ID `697ff81a0e89d326d15befc8` returns data successfully locally

### 2. Scraping Job Status Unknown

**Problem:** Uncertain if the scraping cron job is running on the deployed version.

**Configuration:**
- `render.yaml` shows scraping runs every 6 hours: `schedule: "0 */6 * * *"`
- Local scraping-cron.ts is configured to run every 15 minutes
- The scraping job should be adding new listings automatically

## Fixes Required

### Fix 1: Verify Backend Deployment on Render

**Steps:**
1. Check if the backend service is running on Render.com
2. Test the health endpoint: `https://leaseiq.onrender.com/health`
3. Test the search endpoint: `https://leaseiq.onrender.com/api/search`
4. Test a specific listing: `https://leaseiq.onrender.com/api/search/697ff81a0e89d326d15befc8`

**Quick Test Commands:**
```bash
# Test health endpoint
curl https://leaseiq.onrender.com/health

# Test search endpoint
curl https://leaseiq.onrender.com/api/search?limit=5

# Test specific listing
curl https://leaseiq.onrender.com/api/search/697ff81a0e89d326d15befc8
```

### Fix 2: Check Render Logs

**What to check:**
1. Go to Render.com dashboard
2. Check logs for `leaseiq-api` service
3. Look for:
   - MongoDB connection errors
   - CORS errors
   - 404/500 errors
   - Port binding issues

### Fix 3: Verify Environment Variables on Render

**Required environment variables:**
- `MONGODB_URI` - Must be set correctly
- `PORT` - Should be 10000 (as per render.yaml)
- `NODE_ENV` - Should be "production"
- `FRONTEND_URL` - Should be set to your Vercel URL for CORS

**Check CORS Configuration:**
The backend CORS is configured to allow:
- `https://lease-iq.vercel.app`
- `process.env.FRONTEND_URL`

Make sure `FRONTEND_URL` environment variable is set on Render!

### Fix 4: Update Frontend API Error Handling

**Current Issue:** The frontend shows a generic error message without logging details.

**Recommended Fix:** Add better error logging in the frontend:

```typescript
// In frontend/src/app/listing/[id]/page.tsx
const fetchListing = async (id: string) => {
  try {
    const response = await fetch(`/api/search/${id}`)
    console.log('API Response Status:', response.status)
    console.log('API Response Headers:', response.headers)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      throw new Error('Listing not found')
    }
    
    const data = await response.json()
    console.log('Listing data received:', data)
    setListing(data)
  } catch (error) {
    console.error('Error fetching listing:', error)
  } finally {
    setLoading(false)
  }
}
```

### Fix 5: Check Scraping Job on Render

**Steps:**
1. Go to Render dashboard
2. Find the `leaseiq-scraping` cron job
3. Check the logs to see:
   - When it last ran
   - If it's successfully connecting to MongoDB
   - If it's scraping listings
   - Any errors

**Expected Output:**
```
[2026-02-02T...] Running scraping job...
[2026-02-02T...] Scraping job complete: {
  totalListingsScraped: X,
  newListingsAdded: Y,
  duplicatesDetected: Z,
  errorsEncountered: 0
}
```

### Fix 6: Add Frontend API URL Fallback

**Issue:** The frontend might be calling the wrong API URL.

**Current Config:**
```
NEXT_PUBLIC_API_URL=https://leaseiq.onrender.com
```

**Verify this is correct!** The API should be accessible at this URL.

## Testing Checklist

- [ ] Backend health endpoint responds: `https://leaseiq.onrender.com/health`
- [ ] Backend search endpoint works: `https://leaseiq.onrender.com/api/search`
- [ ] Backend listing detail works: `https://leaseiq.onrender.com/api/search/{id}`
- [ ] CORS allows requests from Vercel frontend
- [ ] MongoDB connection is successful on Render
- [ ] Scraping cron job is running and adding listings
- [ ] Frontend can fetch and display listings
- [ ] Frontend error messages are informative

## Quick Diagnostic Script

Run this to test the deployed API:

```bash
# Save as test-deployed-api.sh
echo "Testing deployed API..."
echo ""

echo "1. Health Check:"
curl -s https://leaseiq.onrender.com/health | jq .
echo ""

echo "2. Search Endpoint (first 2 listings):"
curl -s "https://leaseiq.onrender.com/api/search?limit=2" | jq '.listings[0:2] | .[] | {_id, title, price}'
echo ""

echo "3. Specific Listing:"
curl -s https://leaseiq.onrender.com/api/search/697ff81a0e89d326d15befc8 | jq '{_id, title, address, price}'
echo ""

echo "Done!"
```

## Next Steps

1. **Immediate:** Test the deployed backend API endpoints
2. **If backend is down:** Check Render logs and restart the service
3. **If backend is up but returning errors:** Check MongoDB connection and environment variables
4. **If CORS errors:** Add FRONTEND_URL environment variable on Render
5. **For scraping:** Check the cron job logs and verify it's running every 6 hours
6. **Consider:** Changing scraping schedule to run more frequently (every 1-2 hours instead of 6)

## Database Status (Local Test Results)

✅ **Database is healthy:**
- Total listings: 166
- Active listings: 166
- NYC listings: 127
- Most recent listing: 2/1/2026
- API endpoints work perfectly locally

The issue is definitely with the deployed backend, not the database or code logic.
