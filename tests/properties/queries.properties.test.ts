import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { Listing, IListing } from '../../src/models/listing.model';
import { User } from '../../src/models/user.model';
import { SavedSearch } from '../../src/models/savedSearch.model';
import { ListingInteraction } from '../../src/models/listingInteraction.model';
import {
  buildListingQuery,
  buildTimestampQuery,
  buildHiddenListingExclusionQuery,
  applyPagination,
  createPaginatedResult,
  combineQueryFilters,
  SearchCriteria
} from '../../src/utils/queries';

// Helper generator for valid listings (defined at module level)
const listingGenerator = fc.record({
  address: fc.record({
    street: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // Ensure non-whitespace
    unit: fc.option(fc.string(), { nil: null }),
    city: fc.oneof(
      fc.constant('Manhattan'),
      fc.constant('Brooklyn'),
      fc.constant('Queens'),
      fc.constant('Bronx')
    ),
    state: fc.constant('NY'),
    zipCode: fc.string({ minLength: 5, maxLength: 5 }).filter(s => /^\d{5}$/.test(s)),
    coordinates: fc.record({
      type: fc.constant('Point'),
      coordinates: fc.tuple(
        fc.double({ min: -74.1, max: -73.7 }), // longitude (NYC area)
        fc.double({ min: 40.6, max: 40.9 })    // latitude (NYC area)
      )
    })
  }),
  price: fc.integer({ min: 1000, max: 10000 }),
  availableDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: null }),
  bedrooms: fc.integer({ min: 0, max: 5 }),
  bathrooms: fc.double({ min: 1, max: 4 }),
  squareFootage: fc.option(fc.integer({ min: 300, max: 3000 }), { nil: null }),
  description: fc.string(),
  images: fc.array(fc.webUrl(), { maxLength: 5 }),
  amenities: fc.array(
    fc.oneof(
      fc.constant('parking'),
      fc.constant('laundry'),
      fc.constant('doorman'),
      fc.constant('gym'),
      fc.constant('pool')
    ),
    { maxLength: 3 }
  ),
  petPolicy: fc.record({
    dogsAllowed: fc.boolean(),
    catsAllowed: fc.boolean(),
    petDeposit: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null })
  }),
  brokerFee: fc.record({
    required: fc.boolean(),
    amount: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null })
  }),
  sources: fc.array(
    fc.record({
      sourceName: fc.oneof(fc.constant('StreetEasy'), fc.constant('Zillow')),
      sourceId: fc.uuid(),
      sourceUrl: fc.webUrl(),
      scrapedAt: fc.date()
    }),
    { minLength: 1, maxLength: 2 }
  ),
  isActive: fc.constant(true)
});

describe('Query Utilities Property Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // Feature: database-schema-models, Property 18: Preference-Based Listing Filtering
  // **Validates: Requirements 8.1**
  it('Property 18: Preference-Based Listing Filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 10, maxLength: 20 }),
        fc.record({
          minPrice: fc.option(fc.integer({ min: 1000, max: 5000 }), { nil: null }),
          maxPrice: fc.option(fc.integer({ min: 5000, max: 10000 }), { nil: null }),
          minBedrooms: fc.option(fc.integer({ min: 0, max: 2 }), { nil: null }),
          maxBedrooms: fc.option(fc.integer({ min: 2, max: 5 }), { nil: null }),
          minBathrooms: fc.option(fc.double({ min: 1, max: 2 }), { nil: null }),
          maxBathrooms: fc.option(fc.double({ min: 2, max: 4 }), { nil: null }),
          minSquareFootage: fc.option(fc.integer({ min: 300, max: 1000 }), { nil: null }),
          maxSquareFootage: fc.option(fc.integer({ min: 1000, max: 3000 }), { nil: null }),
          neighborhoods: fc.option(
            fc.array(fc.oneof(fc.constant('Manhattan'), fc.constant('Brooklyn')), { minLength: 1, maxLength: 2 }),
            { nil: undefined }
          ),
          earliestMoveIn: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }), { nil: null }),
          latestMoveIn: fc.option(fc.date({ min: new Date('2024-07-01'), max: new Date('2025-12-31') }), { nil: null }),
          requiresDogsAllowed: fc.boolean(),
          requiresCatsAllowed: fc.boolean(),
          noFeeOnly: fc.boolean(),
          requiredAmenities: fc.option(
            fc.array(fc.oneof(fc.constant('parking'), fc.constant('laundry')), { minLength: 1, maxLength: 2 }),
            { nil: undefined }
          ),
          maxListingAgeDays: fc.option(fc.integer({ min: 1, max: 30 }), { nil: null })
        }),
        async (listingsData, criteria) => {
          // Create listings in database
          const listings = await Listing.insertMany(listingsData);

          // Build query from criteria
          const query = buildListingQuery(criteria);

          // Execute query
          const matchedListings = await Listing.find(query);

          // Verify all matched listings satisfy ALL criteria
          for (const listing of matchedListings) {
            // Price range
            if (criteria.minPrice !== null && criteria.minPrice !== undefined) {
              expect(listing.price).toBeGreaterThanOrEqual(criteria.minPrice);
            }
            if (criteria.maxPrice !== null && criteria.maxPrice !== undefined) {
              expect(listing.price).toBeLessThanOrEqual(criteria.maxPrice);
            }

            // Bedroom range
            if (criteria.minBedrooms !== null && criteria.minBedrooms !== undefined) {
              expect(listing.bedrooms).toBeGreaterThanOrEqual(criteria.minBedrooms);
            }
            if (criteria.maxBedrooms !== null && criteria.maxBedrooms !== undefined) {
              expect(listing.bedrooms).toBeLessThanOrEqual(criteria.maxBedrooms);
            }

            // Bathroom range
            if (criteria.minBathrooms !== null && criteria.minBathrooms !== undefined) {
              expect(listing.bathrooms).toBeGreaterThanOrEqual(criteria.minBathrooms);
            }
            if (criteria.maxBathrooms !== null && criteria.maxBathrooms !== undefined) {
              expect(listing.bathrooms).toBeLessThanOrEqual(criteria.maxBathrooms);
            }

            // Square footage range
            if (criteria.minSquareFootage !== null && criteria.minSquareFootage !== undefined) {
              if (listing.squareFootage !== null) {
                expect(listing.squareFootage).toBeGreaterThanOrEqual(criteria.minSquareFootage);
              }
            }
            if (criteria.maxSquareFootage !== null && criteria.maxSquareFootage !== undefined) {
              if (listing.squareFootage !== null) {
                expect(listing.squareFootage).toBeLessThanOrEqual(criteria.maxSquareFootage);
              }
            }

            // Neighborhoods
            if (criteria.neighborhoods && criteria.neighborhoods.length > 0) {
              expect(criteria.neighborhoods).toContain(listing.address.city);
            }

            // Move-in date range
            if (criteria.earliestMoveIn !== null && criteria.earliestMoveIn !== undefined) {
              if (listing.availableDate !== null) {
                expect(listing.availableDate.getTime()).toBeGreaterThanOrEqual(criteria.earliestMoveIn.getTime());
              }
            }
            if (criteria.latestMoveIn !== null && criteria.latestMoveIn !== undefined) {
              if (listing.availableDate !== null) {
                expect(listing.availableDate.getTime()).toBeLessThanOrEqual(criteria.latestMoveIn.getTime());
              }
            }

            // Pet requirements
            if (criteria.requiresDogsAllowed === true) {
              expect(listing.petPolicy.dogsAllowed).toBe(true);
            }
            if (criteria.requiresCatsAllowed === true) {
              expect(listing.petPolicy.catsAllowed).toBe(true);
            }

            // No fee requirement
            if (criteria.noFeeOnly === true) {
              expect(listing.brokerFee.required).toBe(false);
            }

            // Required amenities (listing must have ALL)
            if (criteria.requiredAmenities && criteria.requiredAmenities.length > 0) {
              for (const amenity of criteria.requiredAmenities) {
                expect(listing.amenities).toContain(amenity);
              }
            }

            // Listing age
            if (criteria.maxListingAgeDays !== null && criteria.maxListingAgeDays !== undefined) {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - criteria.maxListingAgeDays);
              expect(listing.createdAt.getTime()).toBeGreaterThanOrEqual(cutoffDate.getTime());
            }
          }

          // Verify no listings were excluded that should have been included
          for (const listing of listings) {
            let shouldMatch = true;

            // Check each criterion
            if (criteria.minPrice !== null && criteria.minPrice !== undefined && listing.price < criteria.minPrice) {
              shouldMatch = false;
            }
            if (criteria.maxPrice !== null && criteria.maxPrice !== undefined && listing.price > criteria.maxPrice) {
              shouldMatch = false;
            }
            if (criteria.minBedrooms !== null && criteria.minBedrooms !== undefined && listing.bedrooms < criteria.minBedrooms) {
              shouldMatch = false;
            }
            if (criteria.maxBedrooms !== null && criteria.maxBedrooms !== undefined && listing.bedrooms > criteria.maxBedrooms) {
              shouldMatch = false;
            }
            if (criteria.minBathrooms !== null && criteria.minBathrooms !== undefined && listing.bathrooms < criteria.minBathrooms) {
              shouldMatch = false;
            }
            if (criteria.maxBathrooms !== null && criteria.maxBathrooms !== undefined && listing.bathrooms > criteria.maxBathrooms) {
              shouldMatch = false;
            }
            if (criteria.minSquareFootage !== null && criteria.minSquareFootage !== undefined && listing.squareFootage !== null && listing.squareFootage < criteria.minSquareFootage) {
              shouldMatch = false;
            }
            if (criteria.maxSquareFootage !== null && criteria.maxSquareFootage !== undefined && listing.squareFootage !== null && listing.squareFootage > criteria.maxSquareFootage) {
              shouldMatch = false;
            }
            if (criteria.neighborhoods && criteria.neighborhoods.length > 0 && !criteria.neighborhoods.includes(listing.address.city)) {
              shouldMatch = false;
            }
            if (criteria.earliestMoveIn !== null && criteria.earliestMoveIn !== undefined && listing.availableDate !== null && listing.availableDate.getTime() < criteria.earliestMoveIn.getTime()) {
              shouldMatch = false;
            }
            if (criteria.latestMoveIn !== null && criteria.latestMoveIn !== undefined && listing.availableDate !== null && listing.availableDate.getTime() > criteria.latestMoveIn.getTime()) {
              shouldMatch = false;
            }
            if (criteria.requiresDogsAllowed === true && !listing.petPolicy.dogsAllowed) {
              shouldMatch = false;
            }
            if (criteria.requiresCatsAllowed === true && !listing.petPolicy.catsAllowed) {
              shouldMatch = false;
            }
            if (criteria.noFeeOnly === true && listing.brokerFee.required) {
              shouldMatch = false;
            }
            if (criteria.requiredAmenities && criteria.requiredAmenities.length > 0) {
              for (const amenity of criteria.requiredAmenities) {
                if (!listing.amenities.includes(amenity)) {
                  shouldMatch = false;
                  break;
                }
              }
            }
            if (criteria.maxListingAgeDays !== null && criteria.maxListingAgeDays !== undefined) {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - criteria.maxListingAgeDays);
              if (listing.createdAt.getTime() < cutoffDate.getTime()) {
                shouldMatch = false;
              }
            }

            // Verify match status
            const isInResults = matchedListings.some(m => m._id.toString() === listing._id.toString());
            if (shouldMatch) {
              expect(isInResults).toBe(true);
            } else {
              expect(isInResults).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

  // Feature: database-schema-models, Property 19: Timestamp-Based Listing Queries
  // **Validates: Requirements 8.2**
  it('Property 19: Timestamp-Based Listing Queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 5, maxLength: 15 }),
        async (listingsData) => {
          // Create listings at different times
          const listings = [];
          
          for (let i = 0; i < listingsData.length; i++) {
            const listing = await Listing.create(listingsData[i]);
            listings.push(listing);
            
            // Add small delay to ensure different timestamps
            if (i < listingsData.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }

          // Pick a timestamp in the middle
          const middleIndex = Math.floor(listings.length / 2);
          const cutoffTimestamp = listings[middleIndex].createdAt;

          // Build timestamp query
          const query = buildTimestampQuery(cutoffTimestamp);

          // Execute query
          const matchedListings = await Listing.find(query);

          // Verify all matched listings were created or updated after the cutoff
          for (const listing of matchedListings) {
            const createdAfter = listing.createdAt.getTime() > cutoffTimestamp.getTime();
            const updatedAfter = listing.updatedAt.getTime() > cutoffTimestamp.getTime();
            
            expect(createdAfter || updatedAfter).toBe(true);
          }

          // Verify all listings created or updated after cutoff are in results
          for (const listing of listings) {
            const createdAfter = listing.createdAt.getTime() > cutoffTimestamp.getTime();
            const updatedAfter = listing.updatedAt.getTime() > cutoffTimestamp.getTime();
            
            const isInResults = matchedListings.some(m => m._id.toString() === listing._id.toString());
            
            if (createdAfter || updatedAfter) {
              expect(isInResults).toBe(true);
            }
          }

          // Test with updates
          if (listings.length > 0) {
            const listingToUpdate = listings[0];
            const updateCutoff = new Date();
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            listingToUpdate.price = listingToUpdate.price + 100;
            await listingToUpdate.save();

            const updateQuery = buildTimestampQuery(updateCutoff);
            const updatedResults = await Listing.find(updateQuery);

            // Verify the updated listing is in results
            const isInUpdatedResults = updatedResults.some(m => m._id.toString() === listingToUpdate._id.toString());
            expect(isInUpdatedResults).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 20: Multiple Search Matching
  // **Validates: Requirements 8.3**
  it('Property 20: Multiple Search Matching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 5, maxLength: 10 }),
        fc.array(
          fc.record({
            minPrice: fc.option(fc.integer({ min: 1000, max: 5000 }), { nil: null }),
            maxPrice: fc.option(fc.integer({ min: 5000, max: 10000 }), { nil: null }),
            minBedrooms: fc.option(fc.integer({ min: 0, max: 2 }), { nil: null }),
            maxBedrooms: fc.option(fc.integer({ min: 2, max: 5 }), { nil: null }),
          }),
          { minLength: 2, maxLength: 4 }
        ),
        async (listingsData, searchCriteriaList) => {
          // Create listings in database
          const listings = await Listing.insertMany(listingsData);

          // For each search criteria, find matching listings
          const matchesBySearch: Map<number, Set<string>> = new Map();

          for (let i = 0; i < searchCriteriaList.length; i++) {
            const criteria = searchCriteriaList[i];
            const query = buildListingQuery(criteria);
            const matchedListings = await Listing.find(query);
            
            const matchedIds = new Set(matchedListings.map(l => l._id.toString()));
            matchesBySearch.set(i, matchedIds);
          }

          // Verify that if a listing matches multiple searches, it appears in each
          for (const listing of listings) {
            const matchingSearches: number[] = [];

            for (let i = 0; i < searchCriteriaList.length; i++) {
              const criteria = searchCriteriaList[i];
              let matches = true;

              // Check if listing matches this criteria
              if (criteria.minPrice !== null && criteria.minPrice !== undefined && listing.price < criteria.minPrice) {
                matches = false;
              }
              if (criteria.maxPrice !== null && criteria.maxPrice !== undefined && listing.price > criteria.maxPrice) {
                matches = false;
              }
              if (criteria.minBedrooms !== null && criteria.minBedrooms !== undefined && listing.bedrooms < criteria.minBedrooms) {
                matches = false;
              }
              if (criteria.maxBedrooms !== null && criteria.maxBedrooms !== undefined && listing.bedrooms > criteria.maxBedrooms) {
                matches = false;
              }

              if (matches) {
                matchingSearches.push(i);
              }
            }

            // Verify listing appears in results for each matching search
            for (const searchIndex of matchingSearches) {
              const matchedIds = matchesBySearch.get(searchIndex);
              expect(matchedIds).toBeDefined();
              
              if (matchedIds) {
                expect(matchedIds.has(listing._id.toString())).toBe(true);
              }
            }

            // Verify listing does NOT appear in results for non-matching searches
            for (let i = 0; i < searchCriteriaList.length; i++) {
              if (!matchingSearches.includes(i)) {
                const matchedIds = matchesBySearch.get(i);
                expect(matchedIds).toBeDefined();
                
                if (matchedIds) {
                  expect(matchedIds.has(listing._id.toString())).toBe(false);
                }
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 21: Hidden Listing Exclusion
  // **Validates: Requirements 8.4**
  it('Property 21: Hidden Listing Exclusion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 5, maxLength: 10 }),
        fc.integer({ min: 0, max: 4 }), // Number of listings to hide
        async (listingsData, numToHide) => {
          // Create user
          const user = await User.create({
            supabaseId: 'test-user-' + Date.now(),
            email: 'test@example.com',
            displayName: 'Test User'
          });

          // Create listings
          const listings = await Listing.insertMany(listingsData);

          // Hide some listings
          const listingsToHide = listings.slice(0, Math.min(numToHide, listings.length));
          const hiddenListingIds = [];

          for (const listing of listingsToHide) {
            await ListingInteraction.create({
              userId: user._id,
              listingId: listing._id,
              interactionType: 'hidden',
              timestamp: new Date()
            });
            hiddenListingIds.push(listing._id);
          }

          // Build exclusion query
          const exclusionQuery = buildHiddenListingExclusionQuery(hiddenListingIds);

          // Query listings with exclusion
          const visibleListings = await Listing.find(exclusionQuery);

          // Verify hidden listings are NOT in results
          for (const hiddenListing of listingsToHide) {
            const isInResults = visibleListings.some(l => l._id.toString() === hiddenListing._id.toString());
            expect(isInResults).toBe(false);
          }

          // Verify non-hidden listings ARE in results
          const nonHiddenListings = listings.slice(Math.min(numToHide, listings.length));
          for (const listing of nonHiddenListings) {
            const isInResults = visibleListings.some(l => l._id.toString() === listing._id.toString());
            expect(isInResults).toBe(true);
          }

          // Verify total count is correct
          expect(visibleListings.length).toBe(listings.length - listingsToHide.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 22: Listing Query Pagination
  // **Validates: Requirements 8.5**
  it('Property 22: Listing Query Pagination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 10, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }), // Page size
        async (listingsData, pageSize) => {
          // Create listings
          const listings = await Listing.insertMany(listingsData);
          const totalCount = listings.length;
          const totalPages = Math.ceil(totalCount / pageSize);

          // Collect all listings across all pages
          const allPaginatedListings: string[] = [];
          
          for (let page = 1; page <= totalPages; page++) {
            const pagination = applyPagination({ page, pageSize });
            const pageListings = await Listing.find({})
              .skip(pagination.skip)
              .limit(pagination.limit);

            // Verify page size is correct (except possibly last page)
            if (page < totalPages) {
              expect(pageListings.length).toBe(pageSize);
            } else {
              // Last page may have fewer items
              const expectedLastPageSize = totalCount - (pageSize * (totalPages - 1));
              expect(pageListings.length).toBe(expectedLastPageSize);
            }

            // Add listing IDs to collection
            for (const listing of pageListings) {
              allPaginatedListings.push(listing._id.toString());
            }
          }

          // Verify no duplicates across pages
          const uniqueIds = new Set(allPaginatedListings);
          expect(uniqueIds.size).toBe(allPaginatedListings.length);

          // Verify all listings are included
          expect(allPaginatedListings.length).toBe(totalCount);

          // Verify each listing appears exactly once
          for (const listing of listings) {
            const count = allPaginatedListings.filter(id => id === listing._id.toString()).length;
            expect(count).toBe(1);
          }

          // Test createPaginatedResult helper
          const firstPagePagination = applyPagination({ page: 1, pageSize });
          const firstPageData = await Listing.find({})
            .skip(firstPagePagination.skip)
            .limit(firstPagePagination.limit);

          const paginatedResult = createPaginatedResult(
            firstPageData,
            totalCount,
            { page: 1, pageSize }
          );

          expect(paginatedResult.page).toBe(1);
          expect(paginatedResult.pageSize).toBe(pageSize);
          expect(paginatedResult.totalCount).toBe(totalCount);
          expect(paginatedResult.totalPages).toBe(totalPages);
          expect(paginatedResult.data.length).toBe(Math.min(pageSize, totalCount));
        }
      ),
      { numRuns: 100 }
    );
  });
});
