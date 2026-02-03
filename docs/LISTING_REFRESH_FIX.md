# Listing Refresh Fix

## Problem
Listings weren't appearing right away on the webpage after scraping completed. Users had to wait up to 30 minutes to see new listings.

## Root Causes

1. **Backend Cache Too Long**: SearchService had a 30-minute cache TTL
2. **No Frontend Auto-Refresh**: SearchResults component didn't automatically refresh
3. **No Cache Busting**: Frontend could be serving stale cached responses

## Solutions Implemented

### 1. Reduced Backend Cache (search.service.ts)
- Changed cache TTL from 30 minutes to 2 minutes
- New listings now appear within 2 minutes instead of 30

```typescript
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
```

### 2. Added Auto-Refresh to Frontend (SearchResults.tsx)
- Component now auto-refreshes every 2 minutes
- Shows last update timestamp
- Added manual "Refresh" button for immediate updates

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchListings()
  }, 2 * 60 * 1000) // 2 minutes
  return () => clearInterval(interval)
}, [filters, sortOption])
```

### 3. Added Cache-Busting (api.ts)
- Appends timestamp to API requests to prevent browser caching
- Ensures fresh data on every request

```typescript
params.append('_t', Date.now().toString())
```

## Result

New listings now appear on the webpage within 2 minutes of being scraped, with:
- Automatic background refresh every 2 minutes
- Manual refresh button for instant updates
- Visual indicator showing when data was last updated
- No stale cache issues

## Testing

1. Run a scraping job: `npm run scrape`
2. Wait 2 minutes
3. Check the search page - new listings should appear
4. Or click the "Refresh" button for immediate update
