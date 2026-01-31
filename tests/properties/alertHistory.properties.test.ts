import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fc from 'fast-check';
import { AlertHistory, IAlertHistory } from '../../src/models/alertHistory.model';
import { User } from '../../src/models/user.model';
import { SavedSearch } from '../../src/models/savedSearch.model';
import { Listing } from '../../src/models/listing.model';

describe('AlertHistory Model Property Tests', () => {
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

  // Custom generators for alert history data
  const alertHistoryArb = fc.record({
    sentAt: fc.date().filter(d => !isNaN(d.getTime())),
    alertMethod: fc.constantFrom('email', 'in-app'),
    listingCount: fc.integer({ min: 0, max: 100 }),
    deliveryStatus: fc.constantFrom('sent', 'failed', 'bounced'),
    errorMessage: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    openedAt: fc.option(fc.date().filter(d => !isNaN(d.getTime())), { nil: null })
  });

  // Feature: database-schema-models, Property 6: Alert History Schema Completeness
  it('Property 6: Alert History Schema Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        alertHistoryArb,
        async (supabaseId, email, alertData) => {
          // Create a user first
          let user = await User.findOne({ supabaseId });
          if (!user) {
            user = await User.create({
              supabaseId,
              email,
              displayName: null
            });
          }

          // Create a saved search
          const savedSearch = await SavedSearch.create({
            userId: user._id,
            name: 'Test Search',
            criteria: {
              minPrice: null,
              maxPrice: null,
              minBedrooms: null,
              maxBedrooms: null,
              minBathrooms: null,
              maxBathrooms: null,
              minSquareFootage: null,
              maxSquareFootage: null,
              neighborhoods: [],
              earliestMoveIn: null,
              latestMoveIn: null,
              commuteDestination: null,
              maxCommuteMinutes: null,
              requiredAmenities: [],
              requiresDogsAllowed: false,
              requiresCatsAllowed: false,
              noFeeOnly: false,
              maxListingAgeDays: null
            },
            alertsEnabled: true,
            alertFrequency: 'daily',
            alertMethod: 'email'
          });

          // Create alert history document
          const alertHistory = await AlertHistory.create({
            userId: user._id,
            savedSearchId: savedSearch._id,
            ...alertData
          });

          // Verify userId field
          expect(alertHistory.userId).toBeDefined();
          expect(alertHistory.userId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify savedSearchId field
          expect(alertHistory.savedSearchId).toBeDefined();
          expect(alertHistory.savedSearchId).toBeInstanceOf(mongoose.Types.ObjectId);

          // Verify sentAt field
          expect(alertHistory.sentAt).toBeDefined();
          expect(alertHistory.sentAt).toBeInstanceOf(Date);

          // Verify alertMethod field
          expect(alertHistory.alertMethod).toBeDefined();
          expect(['email', 'in-app']).toContain(alertHistory.alertMethod);

          // Verify listingIds array
          expect(Array.isArray(alertHistory.listingIds)).toBe(true);
          alertHistory.listingIds.forEach(listingId => {
            expect(listingId).toBeInstanceOf(mongoose.Types.ObjectId);
          });

          // Verify listingCount field
          expect(alertHistory.listingCount).toBeDefined();
          expect(typeof alertHistory.listingCount).toBe('number');
          expect(Number.isInteger(alertHistory.listingCount)).toBe(true);
          expect(alertHistory.listingCount).toBeGreaterThanOrEqual(0);

          // Verify deliveryStatus field
          expect(alertHistory.deliveryStatus).toBeDefined();
          expect(['sent', 'failed', 'bounced']).toContain(alertHistory.deliveryStatus);

          // Verify errorMessage field (can be null or string)
          if (alertHistory.errorMessage !== null) {
            expect(typeof alertHistory.errorMessage).toBe('string');
          }

          // Verify openedAt field (can be null or Date)
          if (alertHistory.openedAt !== null) {
            expect(alertHistory.openedAt).toBeInstanceOf(Date);
          }

          // Verify clickedListingIds array
          expect(Array.isArray(alertHistory.clickedListingIds)).toBe(true);
          alertHistory.clickedListingIds.forEach(listingId => {
            expect(listingId).toBeInstanceOf(mongoose.Types.ObjectId);
          });

          // Verify timestamps
          expect(alertHistory.createdAt).toBeDefined();
          expect(alertHistory.createdAt).toBeInstanceOf(Date);
          expect(alertHistory.updatedAt).toBeDefined();
          expect(alertHistory.updatedAt).toBeInstanceOf(Date);

          // Verify retrieved document has same completeness
          const retrievedAlert = await AlertHistory.findById(alertHistory._id);
          expect(retrievedAlert).not.toBeNull();
          
          if (retrievedAlert) {
            expect(retrievedAlert.userId.toString()).toBe(user._id.toString());
            expect(retrievedAlert.savedSearchId.toString()).toBe(savedSearch._id.toString());
            expect(retrievedAlert.sentAt).toEqual(alertHistory.sentAt);
            expect(retrievedAlert.alertMethod).toBe(alertHistory.alertMethod);
            expect(retrievedAlert.listingCount).toBe(alertHistory.listingCount);
            expect(retrievedAlert.deliveryStatus).toBe(alertHistory.deliveryStatus);
            expect(retrievedAlert.errorMessage).toBe(alertHistory.errorMessage);
            expect(retrievedAlert.createdAt).toEqual(alertHistory.createdAt);
            expect(retrievedAlert.updatedAt).toEqual(alertHistory.updatedAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
