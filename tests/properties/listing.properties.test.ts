import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { Listing, IListing } from '../../src/models/listing.model';

describe('Listing Model Property Tests', () => {
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

  // Custom generators for listing data
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
    scrapedAt: fc.date()
  });

  const listingArb = fc.record({
    address: addressArb,
    price: fc.double({ min: 1, max: 50000, noNaN: true }),
    availableDate: fc.option(fc.date(), { nil: null }),
    bedrooms: fc.integer({ min: 0, max: 10 }),
    bathrooms: fc.double({ min: 0.5, max: 10, noNaN: true }),
    squareFootage: fc.option(fc.integer({ min: 100, max: 10000 }), { nil: null }),
    description: fc.string(),
    images: fc.array(fc.webUrl(), { maxLength: 10 }),
    amenities: fc.array(fc.constantFrom('parking', 'laundry', 'doorman', 'gym', 'pool', 'elevator'), { maxLength: 6 }),
    petPolicy: petPolicyArb,
    brokerFee: brokerFeeArb,
    sources: fc.array(sourceArb, { minLength: 1, maxLength: 5 }),
    isActive: fc.boolean()
  });

  // Feature: database-schema-models, Property 2: Listing Document Schema Completeness
  it('Property 2: Listing Document Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArb,
        async (listingData) => {
          // Create listing document
          const listing = await Listing.create(listingData);

          // Verify address fields
          expect(listing.address).toBeDefined();
          expect(typeof listing.address.street).toBe('string');
          expect(listing.address.street.trim().length).toBeGreaterThan(0);
          
          if (listing.address.unit !== null) {
            expect(typeof listing.address.unit).toBe('string');
          }
          
          expect(typeof listing.address.city).toBe('string');
          expect(typeof listing.address.state).toBe('string');
          expect(typeof listing.address.zipCode).toBe('string');
          
          // Verify coordinates (GeoJSON format)
          expect(listing.address.coordinates).toBeDefined();
          expect(listing.address.coordinates.type).toBe('Point');
          expect(Array.isArray(listing.address.coordinates.coordinates)).toBe(true);
          expect(listing.address.coordinates.coordinates.length).toBe(2);
          
          const [longitude, latitude] = listing.address.coordinates.coordinates;
          expect(typeof longitude).toBe('number');
          expect(longitude).toBeGreaterThanOrEqual(-180);
          expect(longitude).toBeLessThanOrEqual(180);
          expect(typeof latitude).toBe('number');
          expect(latitude).toBeGreaterThanOrEqual(-90);
          expect(latitude).toBeLessThanOrEqual(90);

          // Verify price
          expect(typeof listing.price).toBe('number');
          expect(listing.price).toBeGreaterThan(0);

          // Verify bedrooms
          expect(typeof listing.bedrooms).toBe('number');
          expect(Number.isInteger(listing.bedrooms)).toBe(true);
          expect(listing.bedrooms).toBeGreaterThanOrEqual(0);

          // Verify bathrooms
          expect(typeof listing.bathrooms).toBe('number');
          expect(listing.bathrooms).toBeGreaterThan(0);

          // Verify description
          expect(typeof listing.description).toBe('string');

          // Verify images array
          expect(Array.isArray(listing.images)).toBe(true);
          listing.images.forEach(img => {
            expect(typeof img).toBe('string');
          });

          // Verify amenities array
          expect(Array.isArray(listing.amenities)).toBe(true);
          listing.amenities.forEach(amenity => {
            expect(typeof amenity).toBe('string');
          });

          // Verify pet policy
          expect(listing.petPolicy).toBeDefined();
          expect(typeof listing.petPolicy.dogsAllowed).toBe('boolean');
          expect(typeof listing.petPolicy.catsAllowed).toBe('boolean');
          if (listing.petPolicy.petDeposit !== null) {
            expect(typeof listing.petPolicy.petDeposit).toBe('number');
          }

          // Verify broker fee
          expect(listing.brokerFee).toBeDefined();
          expect(typeof listing.brokerFee.required).toBe('boolean');
          if (listing.brokerFee.amount !== null) {
            expect(typeof listing.brokerFee.amount).toBe('number');
          }

          // Verify sources array
          expect(Array.isArray(listing.sources)).toBe(true);
          expect(listing.sources.length).toBeGreaterThan(0);
          listing.sources.forEach(source => {
            expect(typeof source.sourceName).toBe('string');
            expect(typeof source.sourceId).toBe('string');
            expect(typeof source.sourceUrl).toBe('string');
            expect(source.scrapedAt).toBeInstanceOf(Date);
          });

          // Verify timestamps
          expect(listing.createdAt).toBeDefined();
          expect(listing.createdAt).toBeInstanceOf(Date);
          expect(listing.updatedAt).toBeDefined();
          expect(listing.updatedAt).toBeInstanceOf(Date);

          // Verify isActive
          expect(typeof listing.isActive).toBe('boolean');

          // Verify retrieved document has same completeness
          const retrievedListing = await Listing.findById(listing._id);
          expect(retrievedListing).not.toBeNull();
          
          if (retrievedListing) {
            expect(retrievedListing.address.street).toBe(listing.address.street);
            expect(retrievedListing.price).toBe(listing.price);
            expect(retrievedListing.bedrooms).toBe(listing.bedrooms);
            expect(retrievedListing.bathrooms).toBe(listing.bathrooms);
            expect(retrievedListing.sources.length).toBe(listing.sources.length);
            expect(retrievedListing.createdAt).toEqual(listing.createdAt);
            expect(retrievedListing.updatedAt).toEqual(listing.updatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 27: Coordinate Validation
  it('Property 27: Coordinate Validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        listingArb,
        fc.double({ min: -200, max: 200, noNaN: true }), // Invalid longitude
        fc.double({ min: -100, max: 100, noNaN: true }), // Invalid latitude
        async (validListingData, invalidLongitude, invalidLatitude) => {
          // Test 1: Valid coordinates should be accepted
          const validListing = await Listing.create(validListingData);
          expect(validListing).toBeDefined();
          
          const [validLon, validLat] = validListing.address.coordinates.coordinates;
          expect(validLon).toBeGreaterThanOrEqual(-180);
          expect(validLon).toBeLessThanOrEqual(180);
          expect(validLat).toBeGreaterThanOrEqual(-90);
          expect(validLat).toBeLessThanOrEqual(90);

          // Test 2: Invalid longitude (outside -180 to 180) should be rejected
          if (invalidLongitude < -180 || invalidLongitude > 180) {
            const invalidLonData = {
              ...validListingData,
              address: {
                ...validListingData.address,
                coordinates: {
                  type: 'Point' as const,
                  coordinates: [invalidLongitude, 0] as [number, number]
                }
              }
            };

            let lonError: Error | null = null;
            try {
              await Listing.create(invalidLonData);
            } catch (error) {
              lonError = error as Error;
            }

            expect(lonError).not.toBeNull();
            if (lonError) {
              expect(lonError.message).toMatch(/coordinate|longitude/i);
            }
          }

          // Test 3: Invalid latitude (outside -90 to 90) should be rejected
          if (invalidLatitude < -90 || invalidLatitude > 90) {
            const invalidLatData = {
              ...validListingData,
              address: {
                ...validListingData.address,
                coordinates: {
                  type: 'Point' as const,
                  coordinates: [0, invalidLatitude] as [number, number]
                }
              }
            };

            let latError: Error | null = null;
            try {
              await Listing.create(invalidLatData);
            } catch (error) {
              latError = error as Error;
            }

            expect(latError).not.toBeNull();
            if (latError) {
              expect(latError.message).toMatch(/coordinate|latitude/i);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
