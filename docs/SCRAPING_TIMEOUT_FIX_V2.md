# Scraping Timeout Fix - February 2026

## Problem
Cron jobs were failing with "Scraping timeout - job exceeded 55 seconds" error. The Firecrawl API calls were taking too long (55+ seconds), causing the entire job to timeout.

## Root Cause
1. Firecrawl client had 120-second timeout (too long for 55s cron limit)
2. No timeout protection around individual source scraping
3. No graceful handling when Firecrawl API is slow
4. Single source taking entire 55+ seconds blocked the job

## Solution Applied

### 1. Reduced Firecrawl Timeout (45 seconds)
**File**: `src/ingestion/services/firecrawl.client.ts`
- Changed timeout from 120s → 45s
- Ensures Firecrawl calls fail fast if API is slow
- Leaves 10 seconds for processing and cleanup

### 2. Added Per-Source Timeout Protection (50 seconds)
**File**: `src/ingestion/services/orchestrator.ts`
- Wrapped each source processing in `Promise.race()` with 50s timeout
- If a source takes >50s, it's skipped and marked as error
- Other sources can still be processed in future runs

### 3. Enhanced Error Handling
- Individual scrape failures no longer crash entire job
- Better logging shows which source/URL failed and how long it took
- Graceful degradation: if scrape returns 0 listings, skip processing

### 4. Better Logging
Added detailed timing logs:
```
[Orchestrator] Scraping apartment_list from https://...
[Orchestrator] Scraped 15 listings from apartment_list in 42000ms
[Orchestrator] Completed apartment_list: 12 new, 3 duplicates, 0 errors in 45000ms
```

## Expected Behavior Now

### Success Case
- Firecrawl returns data in <45s
- Listings processed successfully
- Job completes in <55s

### Timeout Case (Firecrawl slow)
- Firecrawl times out after 45s
- Source marked as error (1 error, 0 listings)
- Job completes gracefully
- Next rotation will try a different source

### Partial Success Case
- Some URLs succeed, some timeout
- Successful listings are processed
- Failed URLs logged as errors
- Job completes with partial results

## Monitoring

Check logs for:
- `Scrape failed for X after Yms` - indicates slow Firecrawl API
- `Source X timeout after 50 seconds` - indicates source-level timeout
- `Completed X: N new, M duplicates, E errors in Zms` - shows per-source performance

## Next Steps

If timeouts persist:
1. Check Firecrawl API status/performance
2. Consider reducing schema complexity (fewer fields to extract)
3. Increase cron interval from 10min → 15min to reduce API load
4. Contact Firecrawl support about slow response times

## Testing

To test locally:
```bash
npm run build
node dist/jobs/scraping-cron.js
```

Should complete in <55 seconds even if Firecrawl is slow.
