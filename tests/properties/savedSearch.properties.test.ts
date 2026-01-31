import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { SavedSearch, ISavedSearch } from '../../src/models/savedSearch.model';
import { User } from '../../src/models/user.model';

describe('SavedSearch Model Property Tests', () => {
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

  // Custom generators for saved search data
  const commuteDestinationArb = fc.option(
    fc.record({
      address: fc.string({ minLength: 1 }),
      coordinates: fc.record({
        latitude: fc.double({ min: -90, max: 90, noNaN: true }),
        longitude: fc.double({ min: -180, max: 180, noNaN: true })
      })
    }),
    { nil: null }
  );

  const criteriaArb = fc.record({
    minPrice: fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: null }),
    maxPrice: fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: null }),
    minBedrooms: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
    maxBedrooms: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
    minBathrooms: fc.option(fc.double({ min: 0, max: 10, noNaN: true }), { nil: null }),
    maxBathrooms: fc.option(fc.double({ min: 0, max: 10, noNaN: true }), { nil: null }),
    minSquareFootage: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: null }),
    maxSquareFootage: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: null }),
    neighborhoods: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
    earliestMoveIn: fc.option(fc.date().filter(d => !isNaN(d.getTime())), { nil: null }),
    latestMoveIn: fc.option(fc.date().filter(d => !isNaN(d.getTime())), { nil: null }),
    commuteDestination: commuteDestinationArb,
    maxCommuteMinutes: fc.option(fc.integer({ min: 1, max: 180 }), { nil: null }),
    requiredAmenities: fc.array(fc.constantFrom('parking', 'laundry', 'doorman', 'gym', 'pool', 'elevator'), { maxLength: 6 }),
    requiresDogsAllowed: fc.boolean(),
    requiresCatsAllowed: fc.boolean(),
    noFeeOnly: fc.boolean(),
    maxListingAgeDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null })
  }).filter(criteria => {
    // Ensure ranges are valid (max >= min)
    if (criteria.minPrice !== null && criteria.maxPrice !== null && criteria.maxPrice < criteria.minPrice) return false;
    if (criteria.minBedrooms !== null && criteria.maxBedrooms !== null && criteria.maxBedrooms < criteria.minBedrooms) return false;
    if (criteria.minBathrooms !== null && criteria.maxBathrooms !== null && criteria.maxBathrooms < criteria.minBathrooms) return false;
    if (criteria.minSquareFootage !== null && criteria.maxSquareFootage !== null && criteria.maxSquareFootage < criteria.minSquareFootage) return false;
    if (criteria.earliestMoveIn !== null && criteria.latestMoveIn !== null && criteria.latestMoveIn < criteria.earliestMoveIn) return false;
    return true;
  });

  const savedSearchArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    criteria: criteriaArb,
    alertsEnabled: fc.boolean(),
    alertFrequency: fc.constantFrom('immediate', 'daily', 'weekly'),
    alertMethod: fc.constantFrom('email', 'in-app', 'both'),
    isActive: fc.option(fc.boolean(), { nil: undefined })
  });

  // Feature: database-schema-models, Property 4: Saved Search Schema Completeness
  it('Property 4: Saved Search Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        savedSearchArb,
        async (supabaseId, email, searchData) => {
          // Create a user first (or find existing one to handle duplicate supabaseId)
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create saved search document
          const search = await SavedSearch.create({
            userId: user._id,
            ...searchData,
            name: searchData.name.trim() || 'Test Search'
          });

          // Verify userId field
          expect(search.userId).toBeDefined();
          expect(search.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify name field
          expect(search.name).toBeDefined();
          expect(typeof search.name).toBe('string');
          expect(search.name.length).toBeGreaterThan(0);
          expect(search.name.length).toBeLessThanOrEqual(100);

          // Verify criteria object exists
          expect(search.criteria).toBeDefined();
          expect(typeof search.criteria).toBe('object');

          // Verify criteria price range fields
          if (search.criteria.minPrice !== null) {
            expect(typeof search.criteria.minPrice).toBe('number');
          }
          if (search.criteria.maxPrice !== null) {
            expect(typeof search.criteria.maxPrice).toBe('number');
          }

          // Verify criteria bedroom range fields
          if (search.criteria.minBedrooms !== null) {
            expect(typeof search.criteria.minBedrooms).toBe('number');
          }
          if (search.criteria.maxBedrooms !== null) {
            expect(typeof search.criteria.maxBedrooms).toBe('number');
          }

          // Verify criteria bathroom range fields
          if (search.criteria.minBathrooms !== null) {
            expect(typeof search.criteria.minBathrooms).toBe('number');
          }
          if (search.criteria.maxBathrooms !== null) {
            expect(typeof search.criteria.maxBathrooms).toBe('number');
          }

          // Verify criteria square footage range fields
          if (search.criteria.minSquareFootage !== null) {
            expect(typeof search.criteria.minSquareFootage).toBe('number');
          }
          if (search.criteria.maxSquareFootage !== null) {
            expect(typeof search.criteria.maxSquareFootage).toBe('number');
          }

          // Verify criteria neighborhoods array
          expect(Array.isArray(search.criteria.neighborhoods)).toBe(true);
          search.criteria.neighborhoods.forEach(neighborhood => {
            expect(typeof neighborhood).toBe('string');
          });

          // Verify criteria move-in date range fields
          if (search.criteria.earliestMoveIn !== null) {
            expect(search.criteria.earliestMoveIn).toBeInstanceOf(Date);
          }
          if (search.criteria.latestMoveIn !== null) {
            expect(search.criteria.latestMoveIn).toBeInstanceOf(Date);
          }

          // Verify criteria commute preferences
          if (search.criteria.commuteDestination !== null) {
            expect(typeof search.criteria.commuteDestination.address).toBe('string');
            expect(typeof search.criteria.commuteDestination.coordinates.latitude).toBe('number');
            expect(typeof search.criteria.commuteDestination.coordinates.longitude).toBe('number');
          }
          if (search.criteria.maxCommuteMinutes !== null) {
            expect(typeof search.criteria.maxCommuteMinutes).toBe('number');
          }

          // Verify criteria amenities array
          expect(Array.isArray(search.criteria.requiredAmenities)).toBe(true);
          search.criteria.requiredAmenities.forEach(amenity => {
            expect(typeof amenity).toBe('string');
          });

          // Verify criteria pet requirements
          expect(typeof search.criteria.requiresDogsAllowed).toBe('boolean');
          expect(typeof search.criteria.requiresCatsAllowed).toBe('boolean');

          // Verify criteria fee preferences
          expect(typeof search.criteria.noFeeOnly).toBe('boolean');

          // Verify criteria listing freshness
          if (search.criteria.maxListingAgeDays !== null) {
            expect(typeof search.criteria.maxListingAgeDays).toBe('number');
          }

          // Verify alert configuration fields
          expect(typeof search.alertsEnabled).toBe('boolean');
          expect(search.alertFrequency).toBeDefined();
          expect(['immediate', 'daily', 'weekly']).toContain(search.alertFrequency);
          expect(search.alertMethod).toBeDefined();
          expect(['email', 'in-app', 'both']).toContain(search.alertMethod);

          // Verify lastAlertSentAt field (can be null or Date)
          if (search.lastAlertSentAt !== null) {
            expect(search.lastAlertSentAt).toBeInstanceOf(Date);
          }

          // Verify isActive field
          expect(typeof search.isActive).toBe('boolean');

          // Verify timestamps
          expect(search.createdAt).toBeDefined();
          expect(search.createdAt).toBeInstanceOf(Date);
          expect(search.updatedAt).toBeDefined();
          expect(search.updatedAt).toBeInstanceOf(Date);

          // Verify retrieved document has same completeness
          const retrievedSearch = await SavedSearch.findById(search._id);
          expect(retrievedSearch).not.toBeNull();
          
          if (retrievedSearch) {
            expect(retrievedSearch.userId.toString()).toBe(user._id.toString());
            expect(retrievedSearch.name).toBe(search.name);
            expect(retrievedSearch.criteria.minPrice).toBe(search.criteria.minPrice);
            expect(retrievedSearch.criteria.maxPrice).toBe(search.criteria.maxPrice);
            expect(retrievedSearch.criteria.neighborhoods).toEqual(search.criteria.neighborhoods);
            expect(retrievedSearch.alertsEnabled).toBe(search.alertsEnabled);
            expect(retrievedSearch.alertFrequency).toBe(search.alertFrequency);
            expect(retrievedSearch.alertMethod).toBe(search.alertMethod);
            expect(retrievedSearch.isActive).toBe(search.isActive);
            expect(retrievedSearch.createdAt).toEqual(search.createdAt);
            expect(retrievedSearch.updatedAt).toEqual(search.updatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 12: Saved Search Default Active Status
  it('Property 12: Saved Search Default Active Status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        criteriaArb,
        fc.constantFrom('immediate', 'daily', 'weekly'),
        fc.constantFrom('email', 'in-app', 'both'),
        async (supabaseId, email, name, criteria, alertFrequency, alertMethod) => {
          // Create a user first (or find existing one to handle duplicate supabaseId)
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create saved search WITHOUT explicitly setting isActive
          const search = await SavedSearch.create({
            userId: user._id,
            name: name.trim() || 'Default Search',
            criteria,
            alertsEnabled: false,
            alertFrequency,
            alertMethod
            // isActive is NOT provided
          });

          // Verify isActive defaults to true
          expect(search.isActive).toBe(true);

          // Verify retrieved document also has isActive = true
          const retrievedSearch = await SavedSearch.findById(search._id);
          expect(retrievedSearch).not.toBeNull();
          
          if (retrievedSearch) {
            expect(retrievedSearch.isActive).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 13: Multiple Active Searches Per User
  it('Property 13: Multiple Active Searches Per User', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        fc.array(savedSearchArb, { minLength: 2, maxLength: 5 }),
        async (supabaseId, email, searchesData) => {
          // Create a user first (or find existing one to handle duplicate supabaseId)
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create multiple saved searches with isActive = true
          const searches = [];
          for (let i = 0; i < searchesData.length; i++) {
            const searchData = searchesData[i];
            const search = await SavedSearch.create({
              userId: user._id,
              ...searchData,
              // Ensure unique names to avoid potential conflicts
              name: searchData.name.trim() || `Search ${i + 1}`,
              isActive: true
            });
            searches.push(search);
          }

          // Verify all searches were created successfully
          expect(searches.length).toBe(searchesData.length);
          expect(searches.length).toBeGreaterThanOrEqual(2);

          // Verify all searches have isActive = true
          searches.forEach(search => {
            expect(search.isActive).toBe(true);
            expect(search.userId.toString()).toBe(user._id.toString());
          });

          // Query for all active searches for this user
          const activeSearches = await SavedSearch.find({
            userId: user._id,
            isActive: true
          });

          // Verify multiple active searches exist simultaneously
          expect(activeSearches.length).toBeGreaterThanOrEqual(searches.length);
          expect(activeSearches.length).toBeGreaterThanOrEqual(2);

          // Verify no constraint violations occurred - all created searches should be found
          const allSearchIds = searches.map(s => s._id.toString()).sort();
          const retrievedSearchIds = activeSearches.map(s => s._id.toString());
          
          allSearchIds.forEach(searchId => {
            expect(retrievedSearchIds).toContain(searchId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 14: Alert Timestamp Initialization
  it('Property 14: Alert Timestamp Initialization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 100 }),
        criteriaArb,
        fc.constantFrom('immediate', 'daily', 'weekly'),
        fc.constantFrom('email', 'in-app', 'both'),
        async (supabaseId, email, name, criteria, alertFrequency, alertMethod) => {
          // Create a user first (or find existing one to handle duplicate supabaseId)
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create saved search with alertsEnabled = true
          const search = await SavedSearch.create({
            userId: user._id,
            name: name.trim() || 'Alert Test',
            criteria,
            alertsEnabled: true,
            alertFrequency,
            alertMethod
          });

          // Verify lastAlertSentAt is initialized
          expect(search.lastAlertSentAt).not.toBeNull();
          expect(search.lastAlertSentAt).toBeInstanceOf(Date);

          // Verify lastAlertSentAt equals createdAt (within reasonable tolerance)
          if (search.lastAlertSentAt && search.createdAt) {
            const timeDiff = Math.abs(search.lastAlertSentAt.getTime() - search.createdAt.getTime());
            expect(timeDiff).toBeLessThan(1000); // Within 1 second
          }

          // Test with alertsEnabled = false
          const searchNoAlerts = await SavedSearch.create({
            userId: user._id,
            name: `${name.trim() || 'No Alert Test'}-no-alerts`,
            criteria,
            alertsEnabled: false,
            alertFrequency,
            alertMethod
          });

          // Verify lastAlertSentAt is null when alerts are disabled
          expect(searchNoAlerts.lastAlertSentAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 29: Saved Search Referential Integrity
  it('Property 29: Saved Search Referential Integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        savedSearchArb,
        async (supabaseId, email, searchData) => {
          // Create a user first (or find existing one to handle duplicate supabaseId)
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create saved search with valid userId reference
          const search = await SavedSearch.create({
            userId: user._id,
            ...searchData,
            name: searchData.name.trim() || 'Referential Test'
          });

          // Verify userId references a valid User document
          expect(search.userId).toBeDefined();
          expect(search.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify the referenced user exists
          const referencedUser = await User.findById(search.userId);
          expect(referencedUser).not.toBeNull();
          
          if (referencedUser) {
            expect(referencedUser._id.toString()).toBe(user._id.toString());
            expect(referencedUser.supabaseId).toBe(supabaseId);
            expect(referencedUser.email).toBe(email);
          }

          // Verify saved search can be queried by userId
          const searchesForUser = await SavedSearch.find({ userId: user._id });
          expect(searchesForUser.length).toBeGreaterThanOrEqual(1);
          
          const foundSearch = searchesForUser.find(s => s._id.toString() === search._id.toString());
          expect(foundSearch).toBeDefined();
          
          if (foundSearch) {
            expect(foundSearch.name).toBe(search.name);
            expect(foundSearch.userId.toString()).toBe(user._id.toString());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
