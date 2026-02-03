# Quick Deploy Checklist - Search Performance Fix

## What Was Fixed
Your search page was slow because:
- ❌ Database indexes weren't optimized for the actual queries
- ❌ Neighborhood search used slow regex instead of indexed lookups
- ❌ NYC filter was overly complex with multiple OR conditions
- ❌ No query timeouts (queries could hang)
- ❌ Fetching too much data from database

## Deploy Steps

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Fix search performance - optimize indexes and queries"
git push
```

### 2. Wait for Deployment
Your hosting platform (Render/Vercel) will automatically deploy.

### 3. Rebuild Database Indexes
**IMPORTANT:** After deployment, run this command to rebuild indexes:

```bash
# If using Render, run via their shell or add as a one-time job
node scripts/rebuild-indexes.js
```

Or manually in MongoDB Atlas:
1. Go to your cluster → Collections → listings
2. Click "Indexes" tab
3. Drop old index: `price_1_bedrooms_1_createdAt_-1`
4. Create new indexes (see docs/SEARCH_PERFORMANCE_FIX.md)

### 4. Test It
Visit your search page and try:
- Basic search (no filters)
- Price range filter
- Bedroom/bathroom filters
- Pet-friendly filter
- No fee filter

**Expected:** Page should load in under 1 second (vs 5-10+ seconds before)

## Files Changed
- ✅ `src/models/listing.model.ts` - Updated indexes
- ✅ `src/services/search.service.ts` - Optimized queries, added timeouts
- ✅ `src/utils/queries.ts` - Simplified neighborhood search
- ✅ `scripts/rebuild-indexes.js` - New script to rebuild indexes
- ✅ `docs/SEARCH_PERFORMANCE_FIX.md` - Full documentation

## Performance Expectations
- **Before:** 5-10+ seconds
- **After:** 300-800ms (10-20x faster!)

## Need Help?
See `docs/SEARCH_PERFORMANCE_FIX.md` for detailed explanation and troubleshooting.
