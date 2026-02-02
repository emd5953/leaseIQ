# NYC Listing Filter Fix - Summary

## Problem Identified
The database contained **214 listings**, but **96 were from outside NYC** (Virginia Beach, Fairfax, Vienna, etc.). This happened because:

1. Firecrawl was extracting listings from pages it navigated to, not just the NYC search results
2. No validation was in place to filter non-NYC listings
3. Address parsing wasn't normalizing state names correctly

## Solution Implemented

### 1. Added NYC Validation in Orchestrator (`src/ingestion/services/orchestrator.ts`)
- Created `isNYCListing()` method that validates:
  - **State**: Must be 'NY' or 'New York'
  - **City**: Must be NYC boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
  - **Coordinates**: Must be within NYC boundaries
    - Latitude: 40.4774 to 40.9176
    - Longitude: -74.2591 to -73.7004
- Rejects listings before they're stored in the database

### 2. Improved Address Normalizer (`src/ingestion/services/normalizer.ts`)
- Normalizes "New York" state to "NY"
- Validates NYC zip codes (10001-10282, 10301-10314, 10451-10475, 11004-11109, 11201-11256)
- Properly handles borough names

### 3. Added NYC Filter to Search Service (`src/services/search.service.ts`)
- All search queries now include NYC-only filter
- Safety net to ensure users only see NYC listings

### 4. Added NYC Filter to Alert Service (`src/services/alert.service.ts`)
- Alerts only include NYC listings
- Both `processAlerts()` and `sendImmediateAlert()` methods updated

### 5. Created Cleanup Script (`scripts/cleanup-non-nyc-listings.js`)
- Removed 96 non-NYC listings from database
- Can be run anytime to clean up bad data

## Results

### Before Fix
- Total listings: 214
- NYC listings: 118
- Non-NYC listings: 96 (45% bad data!)
- States: VA, NY, empty, zip codes in state field

### After Fix
- Total listings: 118
- NYC listings: 118 (100% NYC!)
- States: NY (102), New York (1), empty (15 - but have NYC coordinates)

## Sample NYC Listings (Verified)
1. 311 11th Avenue #2707, New York, NY - $5,595/mo, 1 bed, 1 bath
2. 405 West 206th Street #814, New York, NY - $3,224/mo, 1 bed, 1 bath
3. 567 Fulton Street #3P, Brooklyn, NY - $8,995/mo, 2 bed, 1 bath

## Testing

Run these scripts to verify:
```bash
# Verify current listings
node scripts/verify-nyc-listings.js

# Clean up any non-NYC listings (if needed)
node scripts/cleanup-non-nyc-listings.js
```

## Future Scraping
All new listings scraped will be validated before storage. Non-NYC listings will be automatically rejected with a log message:
```
[Orchestrator] Rejected non-NYC listing: 3500 Green Garden Cir, Virginia Beach, VA 23453
```

## Alert System Status

✅ **Resend Email Service**: Working (API key configured)
✅ **Alert Matching**: Working (filters by user preferences)
✅ **NYC Filtering**: Working (only NYC listings in alerts)
✅ **Data Quality**: Fixed (100% NYC listings)

Users will now only receive alerts for NYC listings that match their saved search preferences.
