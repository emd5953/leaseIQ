import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserPreferences } from '../../src/models/userPreferences.model';
import { User } from '../../src/models/user.model';

describe('UserPreferences Model Validation Edge Cases', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;

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

  // Helper to create a test user before each test
  async function createTestUser() {
    const user = await User.create({
      supabaseId: `test-${Date.now()}-${Math.random()}`,
      email: `test-${Date.now()}@example.com`,
      displayName: null
    });
    return user._id;
  }

  describe('Price Range Validation', () => {
    it('rejects invalid price range (max < min)', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minPrice: 5000,
        maxPrice: 1000
      });

      await expect(prefs.save()).rejects.toThrow(/price/i);
    });

    it('accepts valid price range (max >= min)', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        minPrice: 1000,
        maxPrice: 5000
      });

      expect(prefs.minPrice).toBe(1000);
      expect(prefs.maxPrice).toBe(5000);
    });

    it('accepts equal min and max price', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        minPrice: 2000,
        maxPrice: 2000
      });

      expect(prefs.minPrice).toBe(2000);
      expect(prefs.maxPrice).toBe(2000);
    });

    it('provides descriptive error message for invalid price range', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minPrice: 5000,
        maxPrice: 1000
      });

      try {
        await prefs.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toMatch(/maximum price/i);
        expect(err.message).toMatch(/minimum price/i);
      }
    });
  });

  describe('Bedroom Range Validation', () => {
    it('rejects invalid bedroom range (max < min)', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minBedrooms: 3,
        maxBedrooms: 1
      });

      await expect(prefs.save()).rejects.toThrow(/bedroom/i);
    });

    it('accepts valid bedroom range (max >= min)', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        minBedrooms: 1,
        maxBedrooms: 3
      });

      expect(prefs.minBedrooms).toBe(1);
      expect(prefs.maxBedrooms).toBe(3);
    });

    it('provides descriptive error message for invalid bedroom range', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minBedrooms: 3,
        maxBedrooms: 1
      });

      try {
        await prefs.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toMatch(/maximum bedrooms/i);
        expect(err.message).toMatch(/minimum bedrooms/i);
      }
    });
  });

  describe('Bathroom Range Validation', () => {
    it('rejects invalid bathroom range (max < min)', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minBathrooms: 2.5,
        maxBathrooms: 1.0
      });

      await expect(prefs.save()).rejects.toThrow(/bathroom/i);
    });

    it('accepts valid bathroom range (max >= min)', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        minBathrooms: 1.0,
        maxBathrooms: 2.5
      });

      expect(prefs.minBathrooms).toBe(1.0);
      expect(prefs.maxBathrooms).toBe(2.5);
    });

    it('provides descriptive error message for invalid bathroom range', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minBathrooms: 2.5,
        maxBathrooms: 1.0
      });

      try {
        await prefs.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toMatch(/maximum bathrooms/i);
        expect(err.message).toMatch(/minimum bathrooms/i);
      }
    });
  });

  describe('Square Footage Range Validation', () => {
    it('rejects invalid square footage range (max < min)', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minSquareFootage: 2000,
        maxSquareFootage: 500
      });

      await expect(prefs.save()).rejects.toThrow(/square footage/i);
    });

    it('accepts valid square footage range (max >= min)', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        minSquareFootage: 500,
        maxSquareFootage: 2000
      });

      expect(prefs.minSquareFootage).toBe(500);
      expect(prefs.maxSquareFootage).toBe(2000);
    });

    it('provides descriptive error message for invalid square footage range', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        minSquareFootage: 2000,
        maxSquareFootage: 500
      });

      try {
        await prefs.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toMatch(/maximum square footage/i);
        expect(err.message).toMatch(/minimum square footage/i);
      }
    });
  });

  describe('Move-in Date Range Validation', () => {
    it('rejects invalid move-in date range (latest < earliest)', async () => {
      const userId = await createTestUser();
      
      const earliestDate = new Date('2025-06-01');
      const latestDate = new Date('2025-03-01');
      
      const prefs = new UserPreferences({
        userId,
        earliestMoveIn: earliestDate,
        latestMoveIn: latestDate
      });

      await expect(prefs.save()).rejects.toThrow(/move-in/i);
    });

    it('accepts valid move-in date range (latest >= earliest)', async () => {
      const userId = await createTestUser();
      
      const earliestDate = new Date('2025-03-01');
      const latestDate = new Date('2025-06-01');
      
      const prefs = await UserPreferences.create({
        userId,
        earliestMoveIn: earliestDate,
        latestMoveIn: latestDate
      });

      expect(prefs.earliestMoveIn).toEqual(earliestDate);
      expect(prefs.latestMoveIn).toEqual(latestDate);
    });

    it('accepts equal earliest and latest move-in dates', async () => {
      const userId = await createTestUser();
      
      const moveInDate = new Date('2025-05-01');
      
      const prefs = await UserPreferences.create({
        userId,
        earliestMoveIn: moveInDate,
        latestMoveIn: moveInDate
      });

      expect(prefs.earliestMoveIn).toEqual(moveInDate);
      expect(prefs.latestMoveIn).toEqual(moveInDate);
    });

    it('provides descriptive error message for invalid move-in date range', async () => {
      const userId = await createTestUser();
      
      const earliestDate = new Date('2025-06-01');
      const latestDate = new Date('2025-03-01');
      
      const prefs = new UserPreferences({
        userId,
        earliestMoveIn: earliestDate,
        latestMoveIn: latestDate
      });

      try {
        await prefs.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toMatch(/latest move-in/i);
        expect(err.message).toMatch(/earliest move-in/i);
      }
    });
  });

  describe('Commute Destination Validation', () => {
    it('rejects invalid latitude in commute destination', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        commuteDestination: {
          address: '123 Main St',
          coordinates: {
            latitude: 100, // Invalid: > 90
            longitude: -73.9
          }
        }
      });

      await expect(prefs.save()).rejects.toThrow(/latitude/i);
    });

    it('rejects invalid longitude in commute destination', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        commuteDestination: {
          address: '123 Main St',
          coordinates: {
            latitude: 40.7,
            longitude: -200 // Invalid: < -180
          }
        }
      });

      await expect(prefs.save()).rejects.toThrow(/longitude/i);
    });

    it('accepts valid commute destination coordinates', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
        commuteDestination: {
          address: '123 Main St',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      });

      expect(prefs.commuteDestination).not.toBeNull();
      expect(prefs.commuteDestination?.coordinates.latitude).toBe(40.7128);
      expect(prefs.commuteDestination?.coordinates.longitude).toBe(-74.0060);
    });
  });

  describe('Optional Field Validation', () => {
    it('accepts null values for all optional fields', async () => {
      const userId = await createTestUser();
      
      const prefs = await UserPreferences.create({
        userId,
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

      expect(prefs).toBeDefined();
      expect(prefs.minPrice).toBeNull();
      expect(prefs.maxPrice).toBeNull();
      expect(prefs.commuteDestination).toBeNull();
    });

    it('validates maxCommuteMinutes must be positive', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        maxCommuteMinutes: -10
      });

      await expect(prefs.save()).rejects.toThrow(/commute/i);
    });

    it('validates maxListingAgeDays must be positive integer', async () => {
      const userId = await createTestUser();
      
      const prefs = new UserPreferences({
        userId,
        maxListingAgeDays: -5
      });

      await expect(prefs.save()).rejects.toThrow(/listing age/i);
    });
  });
});
