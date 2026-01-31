import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AlertHistory } from '../../src/models/alertHistory.model';
import { User } from '../../src/models/user.model';
import { SavedSearch } from '../../src/models/savedSearch.model';

describe('AlertHistory Model Validation', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;
  let testSavedSearchId: mongoose.Types.ObjectId;

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

    // Create a test saved search
    const savedSearch = await SavedSearch.create({
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
      alertsEnabled: true,
      alertFrequency: 'daily',
      alertMethod: 'email'
    });
    testSavedSearchId = savedSearch._id;
  });

  it('should reject invalid alertMethod enum value', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'sms' as any,
      listingCount: 5,
      deliveryStatus: 'sent'
    });

    await expect(alertHistory.save()).rejects.toThrow(/alertMethod/);
  });

  it('should reject invalid deliveryStatus enum value', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'pending' as any
    });

    await expect(alertHistory.save()).rejects.toThrow(/deliveryStatus/);
  });

  it('should reject negative listingCount', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: -1,
      deliveryStatus: 'sent'
    });

    await expect(alertHistory.save()).rejects.toThrow(/listingCount/);
  });

  it('should reject non-integer listingCount', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5.5,
      deliveryStatus: 'sent'
    });

    await expect(alertHistory.save()).rejects.toThrow(/listingCount/);
  });

  it('should provide descriptive error message for invalid alertMethod', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'push' as any,
      listingCount: 5,
      deliveryStatus: 'sent'
    });

    try {
      await alertHistory.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.alertMethod).toBeDefined();
      expect(error.errors.alertMethod.message).toMatch(/email|in-app/);
    }
  });

  it('should provide descriptive error message for invalid deliveryStatus', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'delivered' as any
    });

    try {
      await alertHistory.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.deliveryStatus).toBeDefined();
      expect(error.errors.deliveryStatus.message).toMatch(/sent|failed|bounced/);
    }
  });

  it('should provide descriptive error message for invalid listingCount', async () => {
    const alertHistory = new AlertHistory({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: -5,
      deliveryStatus: 'sent'
    });

    try {
      await alertHistory.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.listingCount).toBeDefined();
      expect(error.errors.listingCount.message).toContain('non-negative integer');
    }
  });

  it('should accept valid alertMethod values', async () => {
    const methods: Array<'email' | 'in-app'> = ['email', 'in-app'];

    for (const method of methods) {
      const alertHistory = await AlertHistory.create({
        userId: testUserId,
        savedSearchId: testSavedSearchId,
        sentAt: new Date(),
        alertMethod: method,
        listingCount: 5,
        deliveryStatus: 'sent'
      });

      expect(alertHistory.alertMethod).toBe(method);
    }
  });

  it('should accept valid deliveryStatus values', async () => {
    const statuses: Array<'sent' | 'failed' | 'bounced'> = ['sent', 'failed', 'bounced'];

    for (const status of statuses) {
      const alertHistory = await AlertHistory.create({
        userId: testUserId,
        savedSearchId: testSavedSearchId,
        sentAt: new Date(),
        alertMethod: 'email',
        listingCount: 5,
        deliveryStatus: status
      });

      expect(alertHistory.deliveryStatus).toBe(status);
    }
  });

  it('should accept zero listingCount', async () => {
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 0,
      deliveryStatus: 'sent'
    });

    expect(alertHistory.listingCount).toBe(0);
  });

  it('should accept valid alert history data', async () => {
    const sentAt = new Date();
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt,
      alertMethod: 'email',
      listingIds: [],
      listingCount: 10,
      deliveryStatus: 'sent',
      errorMessage: null,
      openedAt: null,
      clickedListingIds: []
    });

    expect(alertHistory.userId.toString()).toBe(testUserId.toString());
    expect(alertHistory.savedSearchId.toString()).toBe(testSavedSearchId.toString());
    expect(alertHistory.sentAt).toEqual(sentAt);
    expect(alertHistory.alertMethod).toBe('email');
    expect(alertHistory.listingCount).toBe(10);
    expect(alertHistory.deliveryStatus).toBe('sent');
    expect(alertHistory.errorMessage).toBeNull();
    expect(alertHistory.openedAt).toBeNull();
    expect(Array.isArray(alertHistory.listingIds)).toBe(true);
    expect(Array.isArray(alertHistory.clickedListingIds)).toBe(true);
    expect(alertHistory.createdAt).toBeInstanceOf(Date);
    expect(alertHistory.updatedAt).toBeInstanceOf(Date);
  });

  it('should automatically set timestamps', async () => {
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'sent'
    });

    expect(alertHistory.createdAt).toBeInstanceOf(Date);
    expect(alertHistory.updatedAt).toBeInstanceOf(Date);
  });

  it('should update updatedAt on save but preserve createdAt', async () => {
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'sent'
    });

    const originalCreatedAt = alertHistory.createdAt;
    const originalUpdatedAt = alertHistory.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    alertHistory.openedAt = new Date();
    await alertHistory.save();

    expect(alertHistory.createdAt).toEqual(originalCreatedAt);
    expect(alertHistory.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should store errorMessage when delivery fails', async () => {
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'failed',
      errorMessage: 'SMTP connection timeout'
    });

    expect(alertHistory.errorMessage).toBe('SMTP connection timeout');
  });

  it('should store openedAt when user opens alert', async () => {
    const openedAt = new Date();
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingCount: 5,
      deliveryStatus: 'sent',
      openedAt
    });

    expect(alertHistory.openedAt).toEqual(openedAt);
  });

  it('should store clickedListingIds when user clicks listings', async () => {
    const listingId1 = new mongoose.Types.ObjectId();
    const listingId2 = new mongoose.Types.ObjectId();
    
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingIds: [listingId1, listingId2],
      listingCount: 2,
      deliveryStatus: 'sent',
      clickedListingIds: [listingId1]
    });

    expect(alertHistory.clickedListingIds.length).toBe(1);
    expect(alertHistory.clickedListingIds[0].toString()).toBe(listingId1.toString());
  });

  it('should allow listingCount to not match listingIds array length', async () => {
    // This is intentional - listingCount is the total count, but we might not store all listing IDs
    const listingId1 = new mongoose.Types.ObjectId();
    
    const alertHistory = await AlertHistory.create({
      userId: testUserId,
      savedSearchId: testSavedSearchId,
      sentAt: new Date(),
      alertMethod: 'email',
      listingIds: [listingId1],
      listingCount: 10, // More than listingIds array length
      deliveryStatus: 'sent'
    });

    expect(alertHistory.listingCount).toBe(10);
    expect(alertHistory.listingIds.length).toBe(1);
  });
});
