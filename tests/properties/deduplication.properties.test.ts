import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { Listing } from '../../src/models/listing.model';
import { 
  normalizeAddress, 
  calculateDistance, 
  findDuplicates, 
  mergeListing, 
  processListing 
} from '../../src/utils/deduplication';

describe('Listing Deduplication Property Tests', () => {
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

  // Custom generators
  const coordinatesArb = fc.record({
    type: fc.constant('Point'),
    coordinates: fc.tuple(
      fc.double({ min: -180, max: 180, noNaN: true }), // longitude
      fc.double({ min: -90, max: 90, noNaN: true })    // latitude
    )
  });

  const addressArb = fc.record({
    street: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    unit: fc.option(fc.string(), { nil: null }),
    city: fc.string({ minLength: 1 }),
    state: fc.string({ minLength: 2, maxLength: 2 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
    coordinates: coordinatesArb
  });

  const petPolicyArb = fc.record({
    dogsAllowed: fc.boolean(),
    catsAllowed: fc.boolean(),
    petDeposit: fc.option(fc.double({ min: 0, max: 10000, noNaN: true }), { nil: null })
  });

  const brokerFeeArb = fc.record({
    required: fc.boolean(),
    amount: fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: null })
  });

  const sourceArb = fc.record({
    sourceName: fc.constantFrom('StreetEasy', 'Zillow', 'Apartments.com', 'Craigslist', 'Facebook'),
    sourceId: fc.uuid(),
    sourceUrl: fc.webUrl(),
    scrapedAt: fc.date().filter(d => !isNaN(d.getTime()))
  });

  const listingArb = fc.record({
    address: addressArb,
    price: fc.double({ min: 1, max: 50000, noNaN: true }),
    availableDate: fc.option(fc.date().filter(d => !isNaN(d.getTime())), { nil: null }),
    bedrooms: fc.integer({ min: 0, max: 10 }),
    bathrooms: fc.double({ min: 0.5, max: 10, noNaN: true }),
    squareFootage: fc.option(fc.integer({ min: 100, max: 10000 }), { nil: null }),
    description: fc.string(),
    images: fc.array(fc.webUrl(), { maxLength: 10 }),
    amenities: fc.array(fc.constantFrom('parking', 'laundry', 'doorman', 'gym', 'pool', 'elevator'), { maxLength: 6 }),
    petPolicy: petPolicyArb,
    brokerFee: brokerFeeArb,
    sources: fc.array(sourceArb, { minLength: 1, maxLength: 1 }), // Single source for deduplication tests
    isActive: fc.boolean()
  });

  // Feature: database-schema-models, Property 10: Listing Deduplication Behavior
  it('Property 10: Listing Deduplication Behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArb,
        sourceArb,
        fc.double({ min: 1, max: 10000, noNaN: true }), // New price
        fc.option(fc.date().filter(d => !isNaN(d.getTime())), { nil: null }), // New availability
        async (originalListingData, newSource, newPrice, newAvailability) => {
          // Create original listing
          const originalListing = await Listing.create(originalListingData);
          const originalCreatedAt = originalListing.createdAt;
          const originalSourceCount = originalListing.sources.length;

          // Create duplicate listing data with same address/unit but different source
          const duplicateListingData = {
            address: {
              street: originalListingData.address.street,
              unit: originalListingData.address.unit,
              city: originalListingData.address.city,
              state: originalListingData.address.state,
              zipCode: originalListingData.address.zipCode,
              coordinates: {
                type: 'Point' as const,
                coordinates: originalListingData.address.coordinates.coordinates
              }
            },
            price: newPrice,
            availableDate: newAvailability,
            bedrooms: originalListingData.bedrooms,
            bathrooms: originalListingData.bathrooms,
            squareFootage: originalListingData.squareFootage,
            description: 'Updated description from new source',
            images: ['https://example.com/new-image.jpg'],
            amenities: ['parking'],
            petPolicy: originalListingData.petPolicy,
            brokerFee: originalListingData.brokerFee,
            sources: [newSource],
            isActive: true
          };

          // Process the duplicate listing
          const processedListing = await processListing(duplicateListingData);

          // Verify it's the same document (merged, not created new)
          expect(processedListing._id.toString()).toBe(originalListing._id.toString());

          // Verify sources were merged
          expect(processedListing.sources.length).toBe(originalSourceCount + 1);
          
          // Verify both sources are present
          const hasOriginalSource = processedListing.sources.some(
            s => s.sourceId === originalListingData.sources[0].sourceId
          );
          const hasNewSource = processedListing.sources.some(
            s => s.sourceId === newSource.sourceId
          );
          expect(hasOriginalSource).toBe(true);
          expect(hasNewSource).toBe(true);

          // Verify earliest createdAt is preserved
          expect(processedListing.createdAt.getTime()).toBe(originalCreatedAt.getTime());

          // Verify most recent price is used
          expect(processedListing.price).toBe(newPrice);

          // Verify most recent availability is used
          if (newAvailability !== null) {
            expect(processedListing.availableDate).toEqual(newAvailability);
          }

          // Verify only one listing exists in database
          const allListings = await Listing.find({
            'address.street': originalListingData.address.street,
            'address.unit': originalListingData.address.unit
          });
          expect(allListings.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Address normalization consistency
  it('Address normalization is consistent and handles variations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (address) => {
          // Normalization should be idempotent
          const normalized1 = normalizeAddress(address);
          const normalized2 = normalizeAddress(normalized1);
          expect(normalized1).toBe(normalized2);

          // Normalization should be lowercase
          expect(normalized1).toBe(normalized1.toLowerCase());

          // Normalization should not contain multiple consecutive spaces
          expect(normalized1).not.toMatch(/\s{2,}/);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Distance calculation is symmetric
  it('Distance calculation is symmetric and non-negative', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: -180, max: 180, noNaN: true }),
          fc.double({ min: -90, max: 90, noNaN: true })
        ),
        fc.tuple(
          fc.double({ min: -180, max: 180, noNaN: true }),
          fc.double({ min: -90, max: 90, noNaN: true })
        ),
        (coord1, coord2) => {
          const distance1 = calculateDistance(coord1, coord2);
          const distance2 = calculateDistance(coord2, coord1);

          // Distance should be symmetric
          expect(Math.abs(distance1 - distance2)).toBeLessThan(0.001);

          // Distance should be non-negative
          expect(distance1).toBeGreaterThanOrEqual(0);
          expect(distance2).toBeGreaterThanOrEqual(0);

          // Distance to self should be zero
          const distanceToSelf = calculateDistance(coord1, coord1);
          expect(distanceToSelf).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Merge preserves data integrity
  it('Merge operation preserves data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArb,
        sourceArb,
        async (originalData, newSource) => {
          // Create original listing
          const original = await Listing.create(originalData);
          const originalId = original._id;
          const originalCreatedAt = original.createdAt;
          const originalPrice = original.price; // Capture original price before merge

          // Merge with new source
          const newData = {
            sources: [newSource],
            price: originalPrice + 100,
            description: 'New description'
          };

          const merged = await mergeListing(original, newData);

          // Verify ID unchanged
          expect(merged._id.toString()).toBe(originalId.toString());

          // Verify createdAt preserved
          expect(merged.createdAt.getTime()).toBe(originalCreatedAt.getTime());

          // Verify new source added
          const hasNewSource = merged.sources.some(
            s => s.sourceId === newSource.sourceId
          );
          expect(hasNewSource).toBe(true);

          // Verify data updated
          expect(merged.price).toBe(originalPrice + 100);
          expect(merged.description).toBe('New description');
        }
      ),
      { numRuns: 100 }
    );
  });
});
