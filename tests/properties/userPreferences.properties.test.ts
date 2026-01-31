import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { UserPreferences, IUserPreferences } from '../../src/models/userPreferences.model';
import { User } from '../../src/models/user.model';

describe('UserPreferences Model Property Tests', () => {
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

  // Custom generators for user preferences data
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

  const userPreferencesArb = fc.record({
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
  }).filter(prefs => {
    // Ensure ranges are valid (max >= min)
    if (prefs.minPrice !== null && prefs.maxPrice !== null && prefs.maxPrice < prefs.minPrice) return false;
    if (prefs.minBedrooms !== null && prefs.maxBedrooms !== null && prefs.maxBedrooms < prefs.minBedrooms) return false;
    if (prefs.minBathrooms !== null && prefs.maxBathrooms !== null && prefs.maxBathrooms < prefs.minBathrooms) return false;
    if (prefs.minSquareFootage !== null && prefs.maxSquareFootage !== null && prefs.maxSquareFootage < prefs.minSquareFootage) return false;
    if (prefs.earliestMoveIn !== null && prefs.latestMoveIn !== null && prefs.latestMoveIn < prefs.earliestMoveIn) return false;
    return true;
  });

  // Feature: database-schema-models, Property 3: User Preferences Schema Completeness
  it('Property 3: User Preferences Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        userPreferencesArb,
        async (supabaseId, email, prefsData) => {
          // Create a user first (required for referential integrity)
          const user = await User.create({
            supabaseId,
            email,
            displayName: null
          });

          // Create user preferences document
          const prefs = await UserPreferences.create({
            userId: user._id,
            ...prefsData
          });

          // Verify userId field
          expect(prefs.userId).toBeDefined();
          expect(prefs.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify price range fields
          if (prefs.minPrice !== null) {
            expect(typeof prefs.minPrice).toBe('number');
          }
          if (prefs.maxPrice !== null) {
            expect(typeof prefs.maxPrice).toBe('number');
          }

          // Verify bedroom range fields
          if (prefs.minBedrooms !== null) {
            expect(typeof prefs.minBedrooms).toBe('number');
          }
          if (prefs.maxBedrooms !== null) {
            expect(typeof prefs.maxBedrooms).toBe('number');
          }

          // Verify bathroom range fields
          if (prefs.minBathrooms !== null) {
            expect(typeof prefs.minBathrooms).toBe('number');
          }
          if (prefs.maxBathrooms !== null) {
            expect(typeof prefs.maxBathrooms).toBe('number');
          }

          // Verify square footage range fields
          if (prefs.minSquareFootage !== null) {
            expect(typeof prefs.minSquareFootage).toBe('number');
          }
          if (prefs.maxSquareFootage !== null) {
            expect(typeof prefs.maxSquareFootage).toBe('number');
          }

          // Verify neighborhoods array
          expect(Array.isArray(prefs.neighborhoods)).toBe(true);
          prefs.neighborhoods.forEach(neighborhood => {
            expect(typeof neighborhood).toBe('string');
          });

          // Verify move-in date range fields
          if (prefs.earliestMoveIn !== null) {
            expect(prefs.earliestMoveIn).toBeInstanceOf(Date);
          }
          if (prefs.latestMoveIn !== null) {
            expect(prefs.latestMoveIn).toBeInstanceOf(Date);
          }

          // Verify commute preferences
          if (prefs.commuteDestination !== null) {
            expect(typeof prefs.commuteDestination.address).toBe('string');
            expect(typeof prefs.commuteDestination.coordinates.latitude).toBe('number');
            expect(typeof prefs.commuteDestination.coordinates.longitude).toBe('number');
          }
          if (prefs.maxCommuteMinutes !== null) {
            expect(typeof prefs.maxCommuteMinutes).toBe('number');
          }

          // Verify amenities array
          expect(Array.isArray(prefs.requiredAmenities)).toBe(true);
          prefs.requiredAmenities.forEach(amenity => {
            expect(typeof amenity).toBe('string');
          });

          // Verify pet requirements
          expect(typeof prefs.requiresDogsAllowed).toBe('boolean');
          expect(typeof prefs.requiresCatsAllowed).toBe('boolean');

          // Verify fee preferences
          expect(typeof prefs.noFeeOnly).toBe('boolean');

          // Verify listing freshness
          if (prefs.maxListingAgeDays !== null) {
            expect(typeof prefs.maxListingAgeDays).toBe('number');
          }

          // Verify timestamps
          expect(prefs.createdAt).toBeDefined();
          expect(prefs.createdAt).toBeInstanceOf(Date);
          expect(prefs.updatedAt).toBeDefined();
          expect(prefs.updatedAt).toBeInstanceOf(Date);

          // Verify retrieved document has same completeness
          const retrievedPrefs = await UserPreferences.findById(prefs._id);
          expect(retrievedPrefs).not.toBeNull();
          
          if (retrievedPrefs) {
            expect(retrievedPrefs.userId.toString()).toBe(user._id.toString());
            expect(retrievedPrefs.minPrice).toBe(prefs.minPrice);
            expect(retrievedPrefs.maxPrice).toBe(prefs.maxPrice);
            expect(retrievedPrefs.minBedrooms).toBe(prefs.minBedrooms);
            expect(retrievedPrefs.maxBedrooms).toBe(prefs.maxBedrooms);
            expect(retrievedPrefs.neighborhoods).toEqual(prefs.neighborhoods);
            expect(retrievedPrefs.requiresDogsAllowed).toBe(prefs.requiresDogsAllowed);
            expect(retrievedPrefs.requiresCatsAllowed).toBe(prefs.requiresCatsAllowed);
            expect(retrievedPrefs.noFeeOnly).toBe(prefs.noFeeOnly);
            expect(retrievedPrefs.createdAt).toEqual(prefs.createdAt);
            expect(retrievedPrefs.updatedAt).toEqual(prefs.updatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 11: User Preferences Referential Integrity
  it('Property 11: User Preferences Referential Integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        userPreferencesArb,
        async (supabaseId, email, prefsData) => {
          // Create a user first
          const user = await User.create({
            supabaseId,
            email,
            displayName: null
          });

          // Create user preferences with valid userId reference
          const prefs = await UserPreferences.create({
            userId: user._id,
            ...prefsData
          });

          // Verify userId references a valid User document
          expect(prefs.userId).toBeDefined();
          expect(prefs.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify the referenced user exists
          const referencedUser = await User.findById(prefs.userId);
          expect(referencedUser).not.toBeNull();
          
          if (referencedUser) {
            expect(referencedUser._id.toString()).toBe(user._id.toString());
            expect(referencedUser.supabaseId).toBe(supabaseId);
            expect(referencedUser.email).toBe(email);
          }

          // Verify at most one UserPreferences document per userId
          const prefsForUser = await UserPreferences.find({ userId: user._id });
          expect(prefsForUser).toHaveLength(1);
          expect(prefsForUser[0]._id.toString()).toBe(prefs._id.toString());

          // Attempt to create a second UserPreferences for the same user
          let duplicateError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              ...prefsData
            });
          } catch (error) {
            duplicateError = error as Error;
          }

          // Verify that duplicate userId was rejected
          expect(duplicateError).not.toBeNull();
          
          if (duplicateError) {
            // Check for MongoDB duplicate key error (E11000)
            expect(duplicateError.message).toMatch(/duplicate key|E11000/i);
          }

          // Verify still only one UserPreferences exists for this user
          const finalPrefsForUser = await UserPreferences.find({ userId: user._id });
          expect(finalPrefsForUser).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 25: Range Validation Rules
  it('Property 25: Range Validation Rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        fc.double({ min: 100, max: 5000, noNaN: true }),
        fc.double({ min: 10, max: 99, noNaN: true }),
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 1 }),
        fc.double({ min: 2, max: 10, noNaN: true }),
        fc.double({ min: 0.5, max: 1.5, noNaN: true }),
        fc.integer({ min: 1000, max: 5000 }),
        fc.integer({ min: 100, max: 999 }),
        fc.date().filter(d => !isNaN(d.getTime())),
        fc.date().filter(d => !isNaN(d.getTime())),
        async (supabaseId, email, validMaxPrice, invalidMaxPrice, validMaxBedrooms, invalidMaxBedrooms, 
               validMaxBathrooms, invalidMaxBathrooms, validMaxSqFt, invalidMaxSqFt, laterDate, earlierDate) => {
          // Create a user first
          const user = await User.create({
            supabaseId,
            email,
            displayName: null
          });

          // Test 1: Invalid price range (maxPrice < minPrice)
          let priceError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              minPrice: validMaxPrice,
              maxPrice: invalidMaxPrice
            });
          } catch (error) {
            priceError = error as Error;
          }

          expect(priceError).not.toBeNull();
          if (priceError) {
            expect(priceError.message).toMatch(/price/i);
          }

          // Test 2: Invalid bedroom range (maxBedrooms < minBedrooms)
          let bedroomError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              minBedrooms: validMaxBedrooms,
              maxBedrooms: invalidMaxBedrooms
            });
          } catch (error) {
            bedroomError = error as Error;
          }

          expect(bedroomError).not.toBeNull();
          if (bedroomError) {
            expect(bedroomError.message).toMatch(/bedroom/i);
          }

          // Test 3: Invalid bathroom range (maxBathrooms < minBathrooms)
          let bathroomError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              minBathrooms: validMaxBathrooms,
              maxBathrooms: invalidMaxBathrooms
            });
          } catch (error) {
            bathroomError = error as Error;
          }

          expect(bathroomError).not.toBeNull();
          if (bathroomError) {
            expect(bathroomError.message).toMatch(/bathroom/i);
          }

          // Test 4: Invalid square footage range (maxSquareFootage < minSquareFootage)
          let sqFtError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              minSquareFootage: validMaxSqFt,
              maxSquareFootage: invalidMaxSqFt
            });
          } catch (error) {
            sqFtError = error as Error;
          }

          expect(sqFtError).not.toBeNull();
          if (sqFtError) {
            expect(sqFtError.message).toMatch(/square footage/i);
          }

          // Test 5: Invalid move-in date range (latestMoveIn < earliestMoveIn)
          // Ensure laterDate is actually later than earlierDate
          const [earliest, latest] = laterDate > earlierDate ? [earlierDate, laterDate] : [laterDate, earlierDate];
          
          let dateError: Error | null = null;
          try {
            await UserPreferences.create({
              userId: user._id,
              earliestMoveIn: latest,
              latestMoveIn: earliest
            });
          } catch (error) {
            dateError = error as Error;
          }

          expect(dateError).not.toBeNull();
          if (dateError) {
            expect(dateError.message).toMatch(/move-in/i);
          }

          // Test 6: Valid ranges should be accepted
          const validPrefs = await UserPreferences.create({
            userId: user._id,
            minPrice: invalidMaxPrice,
            maxPrice: validMaxPrice,
            minBedrooms: invalidMaxBedrooms,
            maxBedrooms: validMaxBedrooms,
            minBathrooms: invalidMaxBathrooms,
            maxBathrooms: validMaxBathrooms,
            minSquareFootage: invalidMaxSqFt,
            maxSquareFootage: validMaxSqFt,
            earliestMoveIn: earliest,
            latestMoveIn: latest
          });

          expect(validPrefs).toBeDefined();
          expect(validPrefs.maxPrice).toBeGreaterThanOrEqual(validPrefs.minPrice!);
          expect(validPrefs.maxBedrooms).toBeGreaterThanOrEqual(validPrefs.minBedrooms!);
          expect(validPrefs.maxBathrooms).toBeGreaterThanOrEqual(validPrefs.minBathrooms!);
          expect(validPrefs.maxSquareFootage).toBeGreaterThanOrEqual(validPrefs.minSquareFootage!);
          expect(validPrefs.latestMoveIn!.getTime()).toBeGreaterThanOrEqual(validPrefs.earliestMoveIn!.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 30: Optional Field Null Acceptance
  it('Property 30: Optional Field Null Acceptance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (supabaseId, email) => {
          // Create a user first
          const user = await User.create({
            supabaseId,
            email,
            displayName: null
          });

          // Create UserPreferences with all optional fields set to null
          const prefs = await UserPreferences.create({
            userId: user._id,
            minPrice: null,
            maxPrice: null,
            minBedrooms: null,
            maxBedrooms: null,
            minBathrooms: null,
            maxBathrooms: null,
            minSquareFootage: null,
            maxSquareFootage: null,
            earliestMoveIn: null,
            latestMoveIn: null,
            commuteDestination: null,
            maxCommuteMinutes: null,
            maxListingAgeDays: null
          });

          // Verify all optional fields accept null without validation errors
          expect(prefs).toBeDefined();
          expect(prefs.minPrice).toBeNull();
          expect(prefs.maxPrice).toBeNull();
          expect(prefs.minBedrooms).toBeNull();
          expect(prefs.maxBedrooms).toBeNull();
          expect(prefs.minBathrooms).toBeNull();
          expect(prefs.maxBathrooms).toBeNull();
          expect(prefs.minSquareFootage).toBeNull();
          expect(prefs.maxSquareFootage).toBeNull();
          expect(prefs.earliestMoveIn).toBeNull();
          expect(prefs.latestMoveIn).toBeNull();
          expect(prefs.commuteDestination).toBeNull();
          expect(prefs.maxCommuteMinutes).toBeNull();
          expect(prefs.maxListingAgeDays).toBeNull();

          // Verify retrieved document preserves null values
          const retrievedPrefs = await UserPreferences.findById(prefs._id);
          expect(retrievedPrefs).not.toBeNull();
          
          if (retrievedPrefs) {
            expect(retrievedPrefs.minPrice).toBeNull();
            expect(retrievedPrefs.maxPrice).toBeNull();
            expect(retrievedPrefs.minBedrooms).toBeNull();
            expect(retrievedPrefs.maxBedrooms).toBeNull();
            expect(retrievedPrefs.minBathrooms).toBeNull();
            expect(retrievedPrefs.maxBathrooms).toBeNull();
            expect(retrievedPrefs.minSquareFootage).toBeNull();
            expect(retrievedPrefs.maxSquareFootage).toBeNull();
            expect(retrievedPrefs.earliestMoveIn).toBeNull();
            expect(retrievedPrefs.latestMoveIn).toBeNull();
            expect(retrievedPrefs.commuteDestination).toBeNull();
            expect(retrievedPrefs.maxCommuteMinutes).toBeNull();
            expect(retrievedPrefs.maxListingAgeDays).toBeNull();
          }

          // Test updating from null to a value and back to null
          prefs.minPrice = 1000;
          await prefs.save();
          expect(prefs.minPrice).toBe(1000);

          prefs.minPrice = null;
          await prefs.save();
          expect(prefs.minPrice).toBeNull();

          const finalPrefs = await UserPreferences.findById(prefs._id);
          expect(finalPrefs).not.toBeNull();
          if (finalPrefs) {
            expect(finalPrefs.minPrice).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: database-schema-models, Property 28: Commute Destination Coordinates
  it('Property 28: Commute Destination Coordinates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -200, max: 200, noNaN: true }),
        fc.double({ min: -200, max: 200, noNaN: true }),
        async (supabaseId1, supabaseId2, supabaseId3, email, address, validLat, validLon, invalidLat, invalidLon) => {
          // Create a user for valid coordinates test
          const user1 = await User.create({
            supabaseId: supabaseId1,
            email: email,
            displayName: null
          });

          // Test 1: Valid coordinates should be accepted
          const validPrefs = await UserPreferences.create({
            userId: user1._id,
            commuteDestination: {
              address,
              coordinates: {
                latitude: validLat,
                longitude: validLon
              }
            }
          });

          expect(validPrefs).toBeDefined();
          expect(validPrefs.commuteDestination).not.toBeNull();
          
          if (validPrefs.commuteDestination) {
            expect(validPrefs.commuteDestination.coordinates.latitude).toBe(validLat);
            expect(validPrefs.commuteDestination.coordinates.longitude).toBe(validLon);
            expect(validPrefs.commuteDestination.coordinates.latitude).toBeGreaterThanOrEqual(-90);
            expect(validPrefs.commuteDestination.coordinates.latitude).toBeLessThanOrEqual(90);
            expect(validPrefs.commuteDestination.coordinates.longitude).toBeGreaterThanOrEqual(-180);
            expect(validPrefs.commuteDestination.coordinates.longitude).toBeLessThanOrEqual(180);
          }

          // Test 2: Invalid latitude (outside -90 to 90) should be rejected
          if (invalidLat < -90 || invalidLat > 90) {
            const user2 = await User.create({
              supabaseId: supabaseId2,
              email: `lat-${email}`,
              displayName: null
            });

            let latError: Error | null = null;
            try {
              await UserPreferences.create({
                userId: user2._id,
                commuteDestination: {
                  address,
                  coordinates: {
                    latitude: invalidLat,
                    longitude: validLon
                  }
                }
              });
            } catch (error) {
              latError = error as Error;
            }

            expect(latError).not.toBeNull();
            if (latError) {
              expect(latError.message).toMatch(/latitude/i);
            }
          }

          // Test 3: Invalid longitude (outside -180 to 180) should be rejected
          if (invalidLon < -180 || invalidLon > 180) {
            const user3 = await User.create({
              supabaseId: supabaseId3,
              email: `lon-${email}`,
              displayName: null
            });

            let lonError: Error | null = null;
            try {
              await UserPreferences.create({
                userId: user3._id,
                commuteDestination: {
                  address,
                  coordinates: {
                    latitude: validLat,
                    longitude: invalidLon
                  }
                }
              });
            } catch (error) {
              lonError = error as Error;
            }

            expect(lonError).not.toBeNull();
            if (lonError) {
              expect(lonError.message).toMatch(/longitude/i);
            }
          }

          // Test 4: Null commuteDestination should be accepted (reuse user1, delete old prefs)
          await UserPreferences.deleteOne({ userId: user1._id });
          
          const nullCommutePrefs = await UserPreferences.create({
            userId: user1._id,
            commuteDestination: null
          });

          expect(nullCommutePrefs).toBeDefined();
          expect(nullCommutePrefs.commuteDestination).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
