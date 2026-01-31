import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ListingInteraction } from '../../src/models/listingInteraction.model';
import { User } from '../../src/models/user.model';
import { Listing } from '../../src/models/listing.model';

describe('ListingInteraction Model Validation', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;
  let testListingId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create test user and listing for use in tests
    const user = await User.create({
      supabaseId: 'test-user-123',
      email: 'test@example.com'
    });
    testUserId = user._id;

    const listing = await Listing.create({
      address: {
        street: '123 Test St',
        unit: null,
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        coordinates: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610]
        }
      },
      price: 2000,
      bedrooms: 2,
      bathrooms: 1,
      squareFootage: 800,
      description: 'Test listing',
      images: [],
      amenities: [],
      petPolicy: {
        dogsAllowed: false,
        catsAllowed: false,
        petDeposit: null
      },
      brokerFee: {
        required: false,
        amount: null
      },
      sources: [{
        sourceName: 'TestSource',
        sourceId: 'test-123',
        sourceUrl: 'https://test.com/listing',
        scrapedAt: new Date()
      }],
      isActive: true
    });
    testListingId = listing._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear only ListingInteraction collection between tests
    await ListingInteraction.deleteMany({});
  });

  it('should reject invalid interactionType', async () => {
    const interaction = new ListingInteraction({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'invalid-type' as any
    });

    await expect(interaction.save()).rejects.toThrow();
  });

  it('should provide descriptive error message for invalid interactionType', async () => {
    const interaction = new ListingInteraction({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'liked' as any
    });

    try {
      await interaction.save();
      expect.fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.interactionType).toBeDefined();
      expect(error.errors.interactionType.message).toContain('viewed, saved, hidden');
    }
  });

  it('should handle duplicate interaction of same type (unique constraint)', async () => {
    // Create first interaction
    await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'viewed'
    });

    // Attempt to create duplicate interaction
    const duplicateInteraction = new ListingInteraction({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'viewed'
    });

    await expect(duplicateInteraction.save()).rejects.toThrow();
  });

  it('should allow same user to have different interaction types on same listing', async () => {
    // User views a listing
    const viewedInteraction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'viewed'
    });

    // User saves the same listing
    const savedInteraction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'saved'
    });

    expect(viewedInteraction).toBeDefined();
    expect(savedInteraction).toBeDefined();
    expect(viewedInteraction.interactionType).toBe('viewed');
    expect(savedInteraction.interactionType).toBe('saved');
  });

  it('should accept valid viewed interaction', async () => {
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'viewed',
      metadata: {
        viewDurationSeconds: 45,
        notes: null
      }
    });

    expect(interaction.userId.toString()).toBe(testUserId.toString());
    expect(interaction.listingId.toString()).toBe(testListingId.toString());
    expect(interaction.interactionType).toBe('viewed');
    expect(interaction.metadata.viewDurationSeconds).toBe(45);
    expect(interaction.timestamp).toBeInstanceOf(Date);
  });

  it('should accept valid saved interaction', async () => {
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'saved',
      metadata: {
        viewDurationSeconds: null,
        notes: 'Great location!'
      }
    });

    expect(interaction.interactionType).toBe('saved');
    expect(interaction.metadata.notes).toBe('Great location!');
  });

  it('should accept valid hidden interaction', async () => {
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'hidden',
      metadata: {
        viewDurationSeconds: null,
        notes: null
      }
    });

    expect(interaction.interactionType).toBe('hidden');
  });

  it('should automatically set timestamp if not provided', async () => {
    const beforeCreation = new Date();
    
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'viewed'
    });

    const afterCreation = new Date();

    expect(interaction.timestamp).toBeInstanceOf(Date);
    expect(interaction.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(interaction.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should require userId', async () => {
    const interaction = new ListingInteraction({
      listingId: testListingId,
      interactionType: 'viewed'
    });

    await expect(interaction.save()).rejects.toThrow(/userId/);
  });

  it('should require listingId', async () => {
    const interaction = new ListingInteraction({
      userId: testUserId,
      interactionType: 'viewed'
    });

    await expect(interaction.save()).rejects.toThrow(/listingId/);
  });

  it('should require interactionType', async () => {
    const interaction = new ListingInteraction({
      userId: testUserId,
      listingId: testListingId
    });

    await expect(interaction.save()).rejects.toThrow(/interactionType/);
  });

  it('should set default null values for metadata fields', async () => {
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'hidden'
    });

    expect(interaction.metadata.viewDurationSeconds).toBeNull();
    expect(interaction.metadata.notes).toBeNull();
  });

  it('should automatically manage createdAt and updatedAt timestamps', async () => {
    const interaction = await ListingInteraction.create({
      userId: testUserId,
      listingId: testListingId,
      interactionType: 'saved'
    });

    expect(interaction.createdAt).toBeInstanceOf(Date);
    expect(interaction.updatedAt).toBeInstanceOf(Date);
  });
});
