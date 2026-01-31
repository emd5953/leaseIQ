import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { SavedSearch } from '../../src/models/savedSearch.model';
import { User } from '../../src/models/user.model';

describe('SavedSearch Model Validation', () => {
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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  beforeEach(async () => {
    // Create a test user for each test
    const user = await User.create({
      supabaseId: 'test-user-id',
      email: 'test@example.com'
    });
    testUserId = user._id;
  });

  it('should reject empty name', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: '',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    await expect(search.save()).rejects.toThrow(/name/);
  });

  it('should reject whitespace-only name', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: '   ',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    await expect(search.save()).rejects.toThrow(/name/);
  });

  it('should reject name exceeding 100 characters', async () => {
    const longName = 'a'.repeat(101);
    const search = new SavedSearch({
      userId: testUserId,
      name: longName,
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    await expect(search.save()).rejects.toThrow();
  });

  it('should reject invalid alertFrequency enum value', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: 'Test Search',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'invalid-frequency' as any,
      alertMethod: 'email'
    });

    await expect(search.save()).rejects.toThrow(/alertFrequency/);
  });

  it('should reject invalid alertMethod enum value', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: 'Test Search',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'invalid-method' as any
    });

    await expect(search.save()).rejects.toThrow(/alertMethod/);
  });

  it('should provide descriptive error message for empty name', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: '',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    try {
      await search.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.message).toContain('name');
    }
  });

  it('should provide descriptive error message for invalid alertFrequency', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: 'Test Search',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'hourly' as any,
      alertMethod: 'email'
    });

    try {
      await search.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.alertFrequency).toBeDefined();
      expect(error.errors.alertFrequency.message).toMatch(/immediate|daily|weekly/);
    }
  });

  it('should provide descriptive error message for invalid alertMethod', async () => {
    const search = new SavedSearch({
      userId: testUserId,
      name: 'Test Search',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'sms' as any
    });

    try {
      await search.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.alertMethod).toBeDefined();
      expect(error.errors.alertMethod.message).toMatch(/email|in-app|both/);
    }
  });

  it('should accept valid alertFrequency values', async () => {
    const frequencies: Array<'immediate' | 'daily' | 'weekly'> = ['immediate', 'daily', 'weekly'];

    for (const frequency of frequencies) {
      const search = await SavedSearch.create({
        userId: testUserId,
        name: `Test Search ${frequency}`,
        criteria: {
          minPrice: 1000,
          maxPrice: 2000,
          neighborhoods: [],
          requiredAmenities: [],
          requiresDogsAllowed: false,
          requiresCatsAllowed: false,
          noFeeOnly: false
        },
        alertsEnabled: false,
        alertFrequency: frequency,
        alertMethod: 'email'
      });

      expect(search.alertFrequency).toBe(frequency);
    }
  });

  it('should accept valid alertMethod values', async () => {
    const methods: Array<'email' | 'in-app' | 'both'> = ['email', 'in-app', 'both'];

    for (const method of methods) {
      const search = await SavedSearch.create({
        userId: testUserId,
        name: `Test Search ${method}`,
        criteria: {
          minPrice: 1000,
          maxPrice: 2000,
          neighborhoods: [],
          requiredAmenities: [],
          requiresDogsAllowed: false,
          requiresCatsAllowed: false,
          noFeeOnly: false
        },
        alertsEnabled: false,
        alertFrequency: 'daily',
        alertMethod: method
      });

      expect(search.alertMethod).toBe(method);
    }
  });

  it('should accept valid saved search data', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'My Dream Apartment',
      criteria: {
        minPrice: 1000,
        maxPrice: 3000,
        minBedrooms: 1,
        maxBedrooms: 2,
        neighborhoods: ['Brooklyn', 'Queens'],
        requiredAmenities: ['laundry', 'parking'],
        requiresDogsAllowed: true,
        requiresCatsAllowed: false,
        noFeeOnly: true
      },
      alertsEnabled: true,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    expect(search.name).toBe('My Dream Apartment');
    expect(search.criteria.minPrice).toBe(1000);
    expect(search.criteria.maxPrice).toBe(3000);
    expect(search.criteria.neighborhoods).toEqual(['Brooklyn', 'Queens']);
    expect(search.alertsEnabled).toBe(true);
    expect(search.alertFrequency).toBe('daily');
    expect(search.alertMethod).toBe('email');
    expect(search.isActive).toBe(true);
    expect(search.createdAt).toBeInstanceOf(Date);
    expect(search.updatedAt).toBeInstanceOf(Date);
  });

  it('should automatically set timestamps', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'Timestamp Test',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    expect(search.createdAt).toBeInstanceOf(Date);
    expect(search.updatedAt).toBeInstanceOf(Date);
  });

  it('should update updatedAt on save but preserve createdAt', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'Update Test',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    const originalCreatedAt = search.createdAt;
    const originalUpdatedAt = search.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    search.name = 'Updated Name';
    await search.save();

    expect(search.createdAt).toEqual(originalCreatedAt);
    expect(search.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should default isActive to true', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'Default Active Test',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    expect(search.isActive).toBe(true);
  });

  it('should initialize lastAlertSentAt when alertsEnabled is true', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'Alert Init Test',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: true,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    expect(search.lastAlertSentAt).not.toBeNull();
    expect(search.lastAlertSentAt).toBeInstanceOf(Date);
  });

  it('should not initialize lastAlertSentAt when alertsEnabled is false', async () => {
    const search = await SavedSearch.create({
      userId: testUserId,
      name: 'No Alert Init Test',
      criteria: {
        minPrice: 1000,
        maxPrice: 2000,
        neighborhoods: [],
        requiredAmenities: [],
        requiresDogsAllowed: false,
        requiresCatsAllowed: false,
        noFeeOnly: false
      },
      alertsEnabled: false,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });

    expect(search.lastAlertSentAt).toBeNull();
  });
});
