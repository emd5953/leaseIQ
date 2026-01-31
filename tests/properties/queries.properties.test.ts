import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { Listing } from '../../src/models/listing.model';
import { User } from '../../src/models/user.model';
import { ListingInteraction } from '../../src/models/listingInteraction.model';
import {
  buildListingQuery,
  buildTimestampQuery,
  buildHiddenListingExclusionQuery,
  applyPagination,
  createPaginatedResult,
  SearchCriteria
} from '../../src/utils/queries';

// Helper generator for valid listings
const listingGenerator = fc.record({
  address: fc.record({
    street: fc.integer({ min: 1, max: 10000 }).map(n => `${n} Main St`),
    unit: fc.option(fc.integer({ min: 1, max: 100 }).map(n => `Unit ${n}`), { nil: null }),
    city: fc.oneof(
      fc.constant('Manhattan'),
      fc.constant('Brooklyn'),
      fc.constant('Queens'),
      fc.constant('Bronx')
    ),
    state: fc.constant('NY'),
    zipCode: fc.integer({ min: 10000, max: 99999 }).map(n => n.toString()),
    coordinates: fc.record({
      type: fc.constant('Point'),
      coordinates: fc.tuple(
        fc.double({ min: -74.1, max: -73.7, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 40.6, max: 40.9, noNaN: true, noDefaultInfinity: true })
      )
    })
  }),
  price: fc.integer({ min: 1000, max: 10000 }),
  availableDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: null }),
  bedrooms: fc.integer({ min: 0, max: 5 }),
  bathrooms: fc.double({ min: 1, max: 4, noNaN: true }),
  squareFootage: fc.option(fc.integer({ min: 300, max: 3000 }), { nil: null }),
  description: fc.string(),
  images: fc.array(fc.webUrl(), { maxLength: 3 }),
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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // Feature: database-schema-models, Property 18: Preference-Based Listing Filtering
  it('Property 18: Preference-Based Listing Filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 5, maxLength: 10 }),
        fc.record({
          minPrice: fc.option(fc.integer({ min: 1000, max: 5000 }), { nil: null }),
          maxPrice: fc.option(fc.integer({ min: 5000, max: 10000 }), { nil: null }),
          minBedrooms: fc.option(fc.integer({ min: 0, max: 2 }), { nil: null }),
          maxBedrooms: fc.option(fc.integer({ min: 2, max: 5 }), { nil: null }),
          requiresDogsAllowed: fc.boolean(),
          requiresCatsAllowed: fc.boolean(),
          noFeeOnly: fc.boolean()
        }),
        async (listingsData, criteria) => {
          const listings = await Listing.insertMany(listingsData);
          const query = buildListingQuery(criteria);
          const matchedListings = await Listing.find(query);

          for (const listing of matchedListings) {
            if (criteria.minPrice !== null && criteria.minPrice !== undefined) {
              expect(listing.price).toBeGreaterThanOrEqual(criteria.minPrice);
            }
            if (criteria.maxPrice !== null && criteria.maxPrice !== undefined) {
              expect(listing.price).toBeLessThanOrEqual(criteria.maxPrice);
            }
            if (criteria.minBedrooms !== null && criteria.minBedrooms !== undefined) {
              expect(listing.bedrooms).toBeGreaterThanOrEqual(criteria.minBedrooms);
            }
            if (criteria.maxBedrooms !== null && criteria.maxBedrooms !== undefined) {
              expect(listing.bedrooms).toBeLessThanOrEqual(criteria.maxBedrooms);
            }
            if (criteria.requiresDogsAllowed === true) {
              expect(listing.petPolicy.dogsAllowed).toBe(true);
            }
            if (criteria.requiresCatsAllowed === true) {
              expect(listing.petPolicy.catsAllowed).toBe(true);
            }
            if (criteria.noFeeOnly === true) {
              expect(listing.brokerFee.required).toBe(false);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);

  // Feature: database-schema-models, Property 19: Timestamp-Based Listing Queries
  it('Property 19: Timestamp-Based Listing Queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 3, maxLength: 8 }),
        async (listingsData) => {
          const listings = [];
          for (let i = 0; i < listingsData.length; i++) {
            const listing = await Listing.create(listingsData[i]);
            listings.push(listing);
            if (i < listingsData.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }

          const middleIndex = Math.floor(listings.length / 2);
          const cutoffTimestamp = listings[middleIndex].createdAt;
          const query = buildTimestampQuery(cutoffTimestamp);
          const matchedListings = await Listing.find(query);

          for (const listing of matchedListings) {
            const createdAfter = listing.createdAt.getTime() > cutoffTimestamp.getTime();
            const updatedAfter = listing.updatedAt.getTime() > cutoffTimestamp.getTime();
            expect(createdAfter || updatedAfter).toBe(true);
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 15000);

  // Feature: database-schema-models, Property 20: Multiple Search Matching
  it('Property 20: Multiple Search Matching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 3, maxLength: 6 }),
        fc.array(
          fc.record({
            minPrice: fc.option(fc.integer({ min: 1000, max: 5000 }), { nil: null }),
            maxPrice: fc.option(fc.integer({ min: 5000, max: 10000 }), { nil: null })
          }),
          { minLength: 2, maxLength: 3 }
        ),
        async (listingsData, searchCriteriaList) => {
          const listings = await Listing.insertMany(listingsData);
          const matchesBySearch: Map<number, Set<string>> = new Map();

          for (let i = 0; i < searchCriteriaList.length; i++) {
            const criteria = searchCriteriaList[i];
            const query = buildListingQuery(criteria);
            const matchedListings = await Listing.find(query);
            matchesBySearch.set(i, new Set(matchedListings.map(l => l._id.toString())));
          }

          for (const listing of listings) {
            for (let i = 0; i < searchCriteriaList.length; i++) {
              const criteria = searchCriteriaList[i];
              let shouldMatch = true;

              if (criteria.minPrice !== null && criteria.minPrice !== undefined && listing.price < criteria.minPrice) {
                shouldMatch = false;
              }
              if (criteria.maxPrice !== null && criteria.maxPrice !== undefined && listing.price > criteria.maxPrice) {
                shouldMatch = false;
              }

              const matchedIds = matchesBySearch.get(i);
              const isInResults = matchedIds?.has(listing._id.toString()) ?? false;
              
              if (shouldMatch) {
                expect(isInResults).toBe(true);
              } else {
                expect(isInResults).toBe(false);
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: database-schema-models, Property 21: Hidden Listing Exclusion
  it('Property 21: Hidden Listing Exclusion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 3, maxLength: 6 }),
        fc.integer({ min: 0, max: 3 }),
        async (listingsData, numToHide) => {
          const user = await User.create({
            supabaseId: 'test-user-' + Date.now(),
            email: 'test@example.com',
            displayName: 'Test User'
          });

          const listings = await Listing.insertMany(listingsData);
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

          const exclusionQuery = buildHiddenListingExclusionQuery(hiddenListingIds);
          const visibleListings = await Listing.find(exclusionQuery);

          for (const hiddenListing of listingsToHide) {
            const isInResults = visibleListings.some(l => l._id.toString() === hiddenListing._id.toString());
            expect(isInResults).toBe(false);
          }

          expect(visibleListings.length).toBe(listings.length - listingsToHide.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: database-schema-models, Property 22: Listing Query Pagination
  it('Property 22: Listing Query Pagination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(listingGenerator, { minLength: 5, maxLength: 12 }),
        fc.integer({ min: 2, max: 4 }),
        async (listingsData, pageSize) => {
          const listings = await Listing.insertMany(listingsData);
          const totalCount = listings.length;
          const totalPages = Math.ceil(totalCount / pageSize);
          const allPaginatedListings: string[] = [];
          
          for (let page = 1; page <= totalPages; page++) {
            const pagination = applyPagination({ page, pageSize });
            const pageListings = await Listing.find({})
              .skip(pagination.skip)
              .limit(pagination.limit);

            if (page < totalPages) {
              expect(pageListings.length).toBe(pageSize);
            }

            for (const listing of pageListings) {
              allPaginatedListings.push(listing._id.toString());
            }
          }

          const uniqueIds = new Set(allPaginatedListings);
          expect(uniqueIds.size).toBe(allPaginatedListings.length);
          expect(allPaginatedListings.length).toBe(totalCount);

          const paginatedResult = createPaginatedResult(
            listings.slice(0, Math.min(pageSize, totalCount)),
            totalCount,
            { page: 1, pageSize }
          );

          expect(paginatedResult.page).toBe(1);
          expect(paginatedResult.pageSize).toBe(pageSize);
          expect(paginatedResult.totalCount).toBe(totalCount);
          expect(paginatedResult.totalPages).toBe(totalPages);
        }
      ),
      { numRuns: 10 }
    );
  });
});
