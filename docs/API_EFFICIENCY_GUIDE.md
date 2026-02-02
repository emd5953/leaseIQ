# API Efficiency Guide - LeaseIQ

## Current Optimizations Implemented

### ✅ 1. Smart Caching for Saved Listings
**File**: `frontend/src/lib/api.ts`

**What it does**:
- Fetches ALL saved listings once
- Caches IDs in memory for 1 minute
- All checks use cached data
- Invalidates on save/unsave

**Impact**: 95% reduction in API calls
- Before: 20 listings = 20 API calls
- After: 20 listings = 1 API call

### ✅ 2. Dashboard Tab Optimization
**File**: `frontend/src/app/dashboard/page.tsx`

**What it does**:
- Only loads data once per tab
- Doesn't reload when switching back to a tab
- Data persists in component state

**Impact**: 66% reduction in dashboard API calls
- Before: Switch tabs 3 times = 3 API calls
- After: Switch tabs 3 times = 1 API call

### ✅ 3. Search Results Optimization
**File**: `frontend/src/components/search/SearchResults.tsx`

**What it does**:
- Only fetches when filters actually change
- Debounced by React's useEffect dependencies
- Shows loading state during fetch

**Impact**: No unnecessary refetches

### ✅ 4. Environment-Aware Rate Limits
**File**: `src/api/middleware/rateLimiter.ts`

**What it does**:
- Development: 10x higher limits
- Production: Strict limits for cost control

**Limits**:
```
Development:
- Standard: 1000 req / 15 min
- Strict: 200 req / 15 min
- Search: 600 req / 1 min

Production:
- Standard: 100 req / 15 min
- Strict: 20 req / 15 min
- Search: 60 req / 1 min
```

## API Call Inventory

### High Frequency (Optimized)
| Endpoint | Frequency | Optimization | Status |
|----------|-----------|--------------|--------|
| `GET /api/user/saved-listings` | Once per session | Cached 1 min | ✅ |
| `GET /api/user/check-listing/:id` | Per listing card | Uses cache | ✅ |
| `GET /api/search` | Per filter change | Debounced | ✅ |
| `GET /api/user/preferences` | Once per tab | Cached in state | ✅ |
| `GET /api/user/saved-searches` | Once per tab | Cached in state | ✅ |

### Medium Frequency (Acceptable)
| Endpoint | Frequency | Notes |
|----------|-----------|-------|
| `POST /api/user/saved-listings/:id` | Per save action | User-initiated |
| `DELETE /api/user/saved-listings/:id` | Per unsave action | User-initiated |
| `GET /api/search/:id` | Per listing view | Necessary |
| `GET /api/search/recent` | On home page load | Once |

### Low Frequency (Expensive)
| Endpoint | Frequency | Rate Limit | Notes |
|----------|-----------|------------|-------|
| `POST /api/research/:id` | User-initiated | 20/15min | AI-powered |
| `POST /api/lease/analyze` | User-initiated | 20/15min | AI-powered |
| `POST /api/property/analyze` | User-initiated | 20/15min | AI-powered |
| `POST /api/floorplan/analyze` | User-initiated | 20/15min | AI-powered |

## Best Practices Implemented

### ✅ 1. Cache First, Fetch Second
```typescript
// Check cache before making API call
const savedIds = await this.getSavedListingIds() // Uses cache
return { isSaved: savedIds.has(listingId) }
```

### ✅ 2. Invalidate on Mutation
```typescript
// Clear cache when data changes
async saveListing(listingId: string) {
  // ... save logic
  this.invalidateSavedListingsCache() // Clear cache
}
```

### ✅ 3. Conditional Loading
```typescript
// Only load if we don't have data
if (activeTab === 'saved' && savedListings.length === 0) {
  loadData()
}
```

### ✅ 4. Debounced Dependencies
```typescript
// Only refetch when dependencies actually change
useEffect(() => {
  fetchListings()
}, [triggerSearch, sortOption]) // Not on every render
```

### ✅ 5. Loading States
```typescript
// Show loading UI instead of making duplicate calls
if (loading) return <LoadingSkeleton />
```

## Anti-Patterns to Avoid

### ❌ 1. Polling Without Need
```typescript
// BAD: Unnecessary polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchData() // Every 5 seconds!
  }, 5000)
  return () => clearInterval(interval)
}, [])
```

### ❌ 2. Fetching on Every Render
```typescript
// BAD: Missing dependency array
useEffect(() => {
  fetchData() // Runs on EVERY render!
})
```

### ❌ 3. Individual Checks Instead of Batch
```typescript
// BAD: N+1 query problem
listings.forEach(listing => {
  checkIfSaved(listing.id) // 20 API calls!
})

// GOOD: Batch fetch
const savedIds = await getAllSavedIds() // 1 API call
listings.forEach(listing => {
  const isSaved = savedIds.has(listing.id) // No API call
})
```

### ❌ 4. No Cache Invalidation
```typescript
// BAD: Stale data
const cache = await getCache() // Old data
await saveItem() // Data changed!
return cache // Still showing old data!

// GOOD: Invalidate cache
await saveItem()
invalidateCache() // Force refresh
```

## Monitoring API Usage

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "api"
4. Browse the app
5. Count requests

**Healthy patterns**:
- Search page: 1-2 requests (search + saved listings)
- Listing detail: 1 request (get listing)
- Dashboard: 1 request per tab (first visit only)
- Save action: 1 request

**Unhealthy patterns**:
- Multiple identical requests
- Requests on every render
- Requests for data you already have

### Backend Logs
Check terminal for request patterns:
```bash
# Should see reasonable spacing between requests
GET /api/search - 200
GET /api/user/saved-listings - 200
# ... user browses for 30 seconds ...
POST /api/user/saved-listings/123 - 200
```

## Cache Strategy

### Current Implementation
```typescript
{
  type: 'in-memory',
  duration: 60000, // 1 minute
  invalidation: 'on-mutation',
  scope: 'per-session'
}
```

### Future Improvements
1. **localStorage persistence**: Survive page refreshes
2. **Service Worker**: Offline support
3. **React Query**: Advanced caching library
4. **WebSocket**: Real-time updates without polling

## Cost Optimization

### API Costs (Estimated)
```
Free tier limits:
- MongoDB: 512MB storage, 100 connections
- Resend: 100 emails/day
- OpenRouter: Pay per use (~$0.002-0.03 per request)
- Firecrawl: Varies by plan

With current optimizations:
- Average user: ~50 API calls per session
- Heavy user: ~200 API calls per session
- Well within free tier limits
```

### Production Recommendations
1. **Monitor usage**: Set up analytics
2. **Set alerts**: Notify if usage spikes
3. **Implement quotas**: Per-user limits
4. **Cache aggressively**: Longer TTLs in production
5. **Use CDN**: For static assets

## Testing Efficiency

### Manual Test
1. Open DevTools Network tab
2. Clear network log
3. Browse search page with 20 listings
4. Count API calls
5. **Expected**: 1-2 calls
6. **Red flag**: 20+ calls

### Automated Test
```bash
# Check rate limit headers
curl -I http://localhost:3001/api/search

# Should see:
# X-RateLimit-Limit: 600
# X-RateLimit-Remaining: 599
```

## Summary

✅ **Implemented**:
- Smart caching (95% reduction)
- Conditional loading
- Cache invalidation
- Environment-aware limits
- Loading states

✅ **Avoided**:
- N+1 queries
- Unnecessary polling
- Duplicate requests
- Stale cache data

✅ **Result**:
- Efficient API usage
- Fast user experience
- Low server costs
- Scalable architecture

## Quick Reference

**Before making an API call, ask**:
1. Do I already have this data?
2. Can I use cached data?
3. Is this user-initiated?
4. Will this happen frequently?
5. Can I batch this with other requests?

**If yes to #1-2**: Use cache  
**If yes to #3**: Proceed  
**If yes to #4**: Add caching  
**If yes to #5**: Implement batching
