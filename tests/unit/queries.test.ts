import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import { Listing } from '../../src/models/listing.model';
import {
  buildListingQuery,
  buildTimestampQuery,
  buildHiddenListingExclusionQuery,
  applyPagination,
  createPaginatedResult,
  combineQueryFilters,
  SearchCriteria
} from '../../src/utils/queries';

describe('Query Utilities Unit Tests', () => {
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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('buildListingQuery', () => {
    it('should build query with price range', () => {
      const criteria: SearchCriteria = {
        minPrice: 1000,
        maxPrice: 2000
      };

      const query = buildListingQuery(criteria);

      expect(query.price).toEqual({ $gte: 1000, $lte: 2000 });
    });

    it('should build query with bedroom range', () => {
      const criteria: SearchCriteria = {
        minBedrooms: 1,
        maxBedrooms: 3
      };

      const query = buildListingQuery(criteria);

      expect(query.bedrooms).toEqual({ $gte: 1, $lte: 3 });
    });

    it('should build query with neighborhoods', () => {
      const criteria: SearchCriteria = {
        neighborhoods: ['Manhattan', 'Brooklyn']
      };

      const query = buildListingQuery(criteria);

      expect(query['address.city']).toEqual({ $in: ['Manhattan', 'Brooklyn'] });
    });

    it('should build query with pet requirements', () => {
      const criteria: SearchCriteria = {
        requiresDogsAllowed: true,
        requiresCatsAllowed: true
      };

      const query = buildListingQuery(criteria);

      expect(query['petPolicy.dogsAllowed']).toBe(true);
      expect(query['petPolicy.catsAllowed']).toBe(true);
    });

    it('should build query with no fee requirement', () => {
      const criteria: SearchCriteria = {
        noFeeOnly: true
      };

      const query = buildListingQuery(criteria);

      expect(query['brokerFee.required']).toBe(false);
    });

    it('should build query with required amenities', () => {
      const criteria: SearchCriteria = {
        requiredAmenities: ['parking', 'laundry']
      };

      const query = buildListingQuery(criteria);

      expect(query.amenities).toEqual({ $all: ['parking', 'laundry'] });
    });

    it('should handle null criteria values', () => {
      const criteria: SearchCriteria = {
        minPrice: null,
        maxPrice: null,
        minBedrooms: null,
        maxBedrooms: null
      };

      const query = buildListingQuery(criteria);

      expect(query.price).toBeUndefined();
      expect(query.bedrooms).toBeUndefined();
    });

    it('should build query with listing age filter', () => {
      const criteria: SearchCriteria = {
        maxListingAgeDays: 7
      };

      const query = buildListingQuery(criteria);

      expect(query.createdAt).toBeDefined();
      expect(query.createdAt.$gte).toBeInstanceOf(Date);
    });

    it('should combine multiple criteria', () => {
      const criteria: SearchCriteria = {
        minPrice: 1000,
        maxPrice: 3000,
        minBedrooms: 2,
        neighborhoods: ['Manhattan'],
        requiresDogsAllowed: true,
        noFeeOnly: true
      };

      const query = buildListingQuery(criteria);

      expect(query.price).toEqual({ $gte: 1000, $lte: 3000 });
      expect(query.bedrooms).toEqual({ $gte: 2 });
      expect(query['address.city']).toEqual({ $in: ['Manhattan'] });
      expect(query['petPolicy.dogsAllowed']).toBe(true);
      expect(query['brokerFee.required']).toBe(false);
    });
  });

  describe('buildTimestampQuery', () => {
    it('should build query for listings created or updated after timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const query = buildTimestampQuery(timestamp);

      expect(query.$or).toBeDefined();
      expect(query.$or).toHaveLength(2);
      expect(query.$or[0]).toEqual({ createdAt: { $gt: timestamp } });
      expect(query.$or[1]).toEqual({ updatedAt: { $gt: timestamp } });
    });
  });

  describe('buildHiddenListingExclusionQuery', () => {
    it('should build query to exclude hidden listings', () => {
      const hiddenIds = [
        new Types.ObjectId(),
        new Types.ObjectId(),
        new Types.ObjectId()
      ];

      const query = buildHiddenListingExclusionQuery(hiddenIds);

      expect(query._id).toEqual({ $nin: hiddenIds });
    });

    it('should return empty query when no hidden listings', () => {
      const query = buildHiddenListingExclusionQuery([]);

      expect(Object.keys(query)).toHaveLength(0);
    });
  });

  describe('applyPagination', () => {
    it('should calculate correct skip and limit for first page', () => {
      const result = applyPagination({ page: 1, pageSize: 10 });

      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
    });

    it('should calculate correct skip and limit for second page', () => {
      const result = applyPagination({ page: 2, pageSize: 10 });

      expect(result.skip).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should calculate correct skip and limit for third page', () => {
      const result = applyPagination({ page: 3, pageSize: 5 });

      expect(result.skip).toBe(10);
      expect(result.limit).toBe(5);
    });

    it('should handle page 0 by treating it as page 1', () => {
      const result = applyPagination({ page: 0, pageSize: 10 });

      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
    });

    it('should handle negative page by treating it as page 1', () => {
      const result = applyPagination({ page: -5, pageSize: 10 });

      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
    });

    it('should handle pageSize 0 by using 1', () => {
      const result = applyPagination({ page: 1, pageSize: 0 });

      expect(result.skip).toBe(0);
      expect(result.limit).toBe(1);
    });
  });

  describe('createPaginatedResult', () => {
    it('should create paginated result with correct metadata', () => {
      const data = [1, 2, 3, 4, 5];
      const totalCount = 25;
      const options = { page: 1, pageSize: 5 };

      const result = createPaginatedResult(data, totalCount, options);

      expect(result.data).toEqual(data);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(5);
    });

    it('should calculate total pages correctly for non-divisible counts', () => {
      const data = [1, 2, 3];
      const totalCount = 23;
      const options = { page: 1, pageSize: 5 };

      const result = createPaginatedResult(data, totalCount, options);

      expect(result.totalPages).toBe(5); // 23 / 5 = 4.6, rounded up to 5
    });

    it('should handle empty results', () => {
      const data: number[] = [];
      const totalCount = 0;
      const options = { page: 1, pageSize: 10 };

      const result = createPaginatedResult(data, totalCount, options);

      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle last page with fewer items', () => {
      const data = [1, 2, 3];
      const totalCount = 23;
      const options = { page: 5, pageSize: 5 };

      const result = createPaginatedResult(data, totalCount, options);

      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(5);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('combineQueryFilters', () => {
    it('should combine multiple filters with $and', () => {
      const filter1 = { price: { $gte: 1000 } };
      const filter2 = { bedrooms: { $gte: 2 } };
      const filter3 = { 'address.city': 'Manhattan' };

      const combined = combineQueryFilters(filter1, filter2, filter3);

      expect(combined.$and).toBeDefined();
      expect(combined.$and).toHaveLength(3);
      expect(combined.$and).toContainEqual(filter1);
      expect(combined.$and).toContainEqual(filter2);
      expect(combined.$and).toContainEqual(filter3);
    });

    it('should return empty object when no filters provided', () => {
      const combined = combineQueryFilters();

      expect(Object.keys(combined)).toHaveLength(0);
    });

    it('should return single filter when only one provided', () => {
      const filter = { price: { $gte: 1000 } };

      const combined = combineQueryFilters(filter);

      expect(combined).toEqual(filter);
      expect(combined.$and).toBeUndefined();
    });

    it('should ignore empty filters', () => {
      const filter1 = { price: { $gte: 1000 } };
      const filter2 = {};
      const filter3 = { bedrooms: { $gte: 2 } };

      const combined = combineQueryFilters(filter1, filter2, filter3);

      expect(combined.$and).toBeDefined();
      expect(combined.$and).toHaveLength(2);
      expect(combined.$and).toContainEqual(filter1);
      expect(combined.$and).toContainEqual(filter3);
    });
  });

  describe('Integration: Query with Pagination', () => {
    it('should query and paginate listings correctly', async () => {
      // Create test listings
      const listings = [];
      for (let i = 0; i < 15; i++) {
        const listing = await Listing.create({
          address: {
            street: `${i} Test St`,
            unit: null,
            city: 'Manhattan',
            state: 'NY',
            zipCode: '10001',
            coordinates: {
              type: 'Point',
              coordinates: [-73.9, 40.7]
            }
          },
          price: 1000 + (i * 100),
          bedrooms: 1 + (i % 3),
          bathrooms: 1,
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
            sourceName: 'Test',
            sourceId: `test-${i}`,
            sourceUrl: 'http://test.com',
            scrapedAt: new Date()
          }],
          isActive: true
        });
        listings.push(listing);
      }

      // Build query for 2-bedroom listings
      const criteria: SearchCriteria = {
        minBedrooms: 2,
        maxBedrooms: 2
      };
      const query = buildListingQuery(criteria);

      // Get total count
      const totalCount = await Listing.countDocuments(query);

      // Get first page
      const pagination = applyPagination({ page: 1, pageSize: 3 });
      const pageData = await Listing.find(query)
        .skip(pagination.skip)
        .limit(pagination.limit);

      // Create paginated result
      const result = createPaginatedResult(pageData, totalCount, { page: 1, pageSize: 3 });

      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);

      // Verify all results match criteria
      for (const listing of result.data) {
        expect(listing.bedrooms).toBe(2);
      }
    });
  });
});
