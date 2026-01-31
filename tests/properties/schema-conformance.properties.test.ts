import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { ListingModel } from '../../src/ingestion/models/listing.schema';
import { ListingSource } from '../../src/ingestion/types';

// Feature: listing-ingestion-pipeline, Property 3: Schema Conformance
describe('Property 3: Schema Conformance', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Generators for property-based testing
  const listingSourceArb = fc.constantFrom(
    ListingSource.STREETEASY,
    ListingSource.ZILLOW,
    ListingSource.APARTMENTS_COM,
    ListingSource.CRAIGSLIST,
    ListingSource.FACEBOOK
  );

  const sourceReferenceArb = fc.record({
    source: listingSourceArb,
    sourceUrl: fc.webUrl(),
    sourceId: fc.string({ minLength: 1, maxLength: 50 }),
    firstSeenAt: fc.date(),
    lastSeenAt: fc.date(),
  });

  const addressArb = fc.record({
    street: fc.string({ minLength: 5, maxLength: 100 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 2 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
    fullAddress: fc.string({ minLength: 10, maxLength: 200 }),
  });

  const priceArb = fc.record({
    amount: fc.integer({ min: 100, max: 50000 }),
    currency: fc.constant('USD'),
    period: fc.constantFrom('monthly', 'weekly', 'daily'),
  });

  const petPolicyArb = fc.record({
    allowed: fc.boolean(),
    restrictions: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    deposit: fc.option(fc.integer({ min: 0, max: 5000 }), { nil: null }),
  });

  const brokerFeeArb = fc.record({
    required: fc.boolean(),
    amount: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: null }),
    percentage: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  });

  const coordinatesArb = fc.record({
    type: fc.constant('Point' as const),
    coordinates: fc.tuple(
      fc.double({ min: -180, max: 180 }), // longitude
      fc.double({ min: -90, max: 90 })    // latitude
    ),
  });

  const parsedListingArb = fc.record({
    sources: fc.array(sourceReferenceArb, { minLength: 1, maxLength: 5 }),
    address: addressArb,
    price: priceArb,
    bedrooms: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
    bathrooms: fc.option(fc.double({ min: 0, max: 10 }), { nil: null }),
    squareFeet: fc.option(fc.integer({ min: 100, max: 10000 }), { nil: null }),
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
    images: fc.array(fc.webUrl(), { maxLength: 20 }),
    amenities: fc.array(fc.string({ maxLength: 50 }), { maxLength: 30 }),
    petPolicy: fc.option(petPolicyArb, { nil: null }),
    brokerFee: fc.option(brokerFeeArb, { nil: null }),
    coordinates: fc.option(coordinatesArb, { nil: undefined }),
  });

  it('**Validates: Requirements 2.12** - For any parsed listing, the normalized listing should conform to the unified Listing schema', async () => {
    await fc.assert(
      fc.asyncProperty(parsedListingArb, async (parsedListing) => {
        // Create a listing document from the parsed listing
        const listing = new ListingModel(parsedListing);

        // Validate the document
        const validationError = listing.validateSync();
        
        // The listing should pass validation
        expect(validationError).toBeUndefined();

        // Save to database to ensure it conforms to schema
        const saved = await listing.save();

        // Verify all required fields are present
        expect(saved._id).toBeDefined();
        expect(saved.sources).toBeDefined();
        expect(saved.sources.length).toBeGreaterThan(0);
        expect(saved.address).toBeDefined();
        expect(saved.address.street).toBeDefined();
        expect(saved.address.city).toBeDefined();
        expect(saved.address.state).toBeDefined();
        expect(saved.address.zipCode).toBeDefined();
        expect(saved.address.fullAddress).toBeDefined();
        expect(saved.price).toBeDefined();
        expect(saved.price.amount).toBeGreaterThan(0);
        expect(saved.isActive).toBe(true);
        expect(saved.createdAt).toBeDefined();
        expect(saved.updatedAt).toBeDefined();

        // Verify optional fields maintain their values or defaults
        if (parsedListing.bedrooms !== null) {
          expect(saved.bedrooms).toBe(parsedListing.bedrooms);
        }
        if (parsedListing.bathrooms !== null) {
          expect(saved.bathrooms).toBe(parsedListing.bathrooms);
        }
        if (parsedListing.coordinates) {
          expect(saved.coordinates?.type).toBe('Point');
          expect(saved.coordinates?.coordinates).toBeDefined();
        }

        // Clean up
        await ListingModel.deleteOne({ _id: saved._id });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle listings with minimal required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        sourceReferenceArb,
        addressArb,
        priceArb,
        async (source, address, price) => {
          const listing = new ListingModel({
            sources: [source],
            address,
            price,
            images: [],
            amenities: [],
          });

          const saved = await listing.save();
          expect(saved._id).toBeDefined();
          expect(saved.bedrooms).toBeNull();
          expect(saved.bathrooms).toBeNull();
          expect(saved.squareFeet).toBeNull();
          expect(saved.description).toBeNull();

          await ListingModel.deleteOne({ _id: saved._id });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle listings with all optional fields populated', async () => {
    await fc.assert(
      fc.asyncProperty(parsedListingArb, async (parsedListing) => {
        // Ensure all optional fields are populated
        const fullListing = {
          ...parsedListing,
          bedrooms: parsedListing.bedrooms ?? 2,
          bathrooms: parsedListing.bathrooms ?? 1,
          squareFeet: parsedListing.squareFeet ?? 800,
          description: parsedListing.description ?? 'Test description',
          petPolicy: parsedListing.petPolicy ?? {
            allowed: true,
            restrictions: null,
            deposit: null,
          },
          brokerFee: parsedListing.brokerFee ?? {
            required: false,
            amount: null,
            percentage: null,
          },
        };

        const listing = new ListingModel(fullListing);
        const saved = await listing.save();

        expect(saved.bedrooms).toBeDefined();
        expect(saved.bathrooms).toBeDefined();
        expect(saved.squareFeet).toBeDefined();
        expect(saved.description).toBeDefined();
        expect(saved.petPolicy).toBeDefined();
        expect(saved.brokerFee).toBeDefined();

        await ListingModel.deleteOne({ _id: saved._id });
      }),
      { numRuns: 50 }
    );
  });
});
