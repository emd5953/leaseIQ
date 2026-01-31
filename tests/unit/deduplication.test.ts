import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Listing } from '../../src/models/listing.model';
import { 
  normalizeAddress, 
  calculateDistance, 
  findDuplicates, 
  mergeListing, 
  processListing 
} from '../../src/utils/deduplication';

describe('Deduplication Utility Unit Tests', () => {
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

  describe('normalizeAddress', () => {
    it('converts to lowercase', () => {
      expect(normalizeAddress('123 Main Street')).toBe('123 main st');
      expect(normalizeAddress('BROADWAY AVE')).toBe('broadway ave');
    });

    it('removes punctuation', () => {
      expect(normalizeAddress('123, Main St.')).toBe('123 main st');
      expect(normalizeAddress('Apt. 4B!')).toBe('apt 4b');
    });

    it('standardizes abbreviations', () => {
      expect(normalizeAddress('Main Street')).toBe('main st');
      expect(normalizeAddress('Park Avenue')).toBe('park ave');
      expect(normalizeAddress('Oak Road')).toBe('oak rd');
      expect(normalizeAddress('Elm Boulevard')).toBe('elm blvd');
      expect(normalizeAddress('Pine Drive')).toBe('pine dr');
      expect(normalizeAddress('Maple Lane')).toBe('maple ln');
      expect(normalizeAddress('Cedar Court')).toBe('cedar ct');
      expect(normalizeAddress('Birch Place')).toBe('birch pl');
      expect(normalizeAddress('Willow Terrace')).toBe('willow ter');
      expect(normalizeAddress('Oak Parkway')).toBe('oak pkwy');
    });

    it('standardizes directional abbreviations', () => {
      expect(normalizeAddress('North Main Street')).toBe('n main st');
      expect(normalizeAddress('South Park Avenue')).toBe('s park ave');
      expect(normalizeAddress('East Oak Road')).toBe('e oak rd');
      expect(normalizeAddress('West Elm Boulevard')).toBe('w elm blvd');
    });

    it('standardizes unit abbreviations', () => {
      expect(normalizeAddress('Apartment 4B')).toBe('apt 4b');
      expect(normalizeAddress('Suite 200')).toBe('ste 200');
      expect(normalizeAddress('Floor 3')).toBe('fl 3');
      expect(normalizeAddress('Building A')).toBe('bldg a');
    });

    it('removes extra whitespace', () => {
      expect(normalizeAddress('123   Main    Street')).toBe('123 main st');
      expect(normalizeAddress('  Broadway  Ave  ')).toBe('broadway ave');
    });

    it('handles empty or null input', () => {
      expect(normalizeAddress('')).toBe('');
      expect(normalizeAddress(null as any)).toBe('');
    });

    it('preserves hyphens in unit numbers', () => {
      expect(normalizeAddress('Apt 4-B')).toBe('apt 4-b');
      expect(normalizeAddress('Unit 12-34')).toBe('unit 12-34');
    });

    it('handles complex addresses', () => {
      const input = '123 North Main Street, Apartment 4-B';
      const expected = '123 n main st apt 4-b';
      expect(normalizeAddress(input)).toBe(expected);
    });
  });

  describe('calculateDistance', () => {
    it('calculates distance between two coordinates', () => {
      // New York City coordinates (approximately)
      const coord1: [number, number] = [-74.006, 40.7128]; // Manhattan
      const coord2: [number, number] = [-73.935, 40.7306]; // Queens
      
      const distance = calculateDistance(coord1, coord2);
      
      // Distance should be approximately 6-7 km
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(8000);
    });

    it('returns zero for identical coordinates', () => {
      const coord: [number, number] = [-74.006, 40.7128];
      const distance = calculateDistance(coord, coord);
      
      expect(distance).toBeLessThan(0.001);
    });

    it('calculates small distances accurately', () => {
      // Two points 50 meters apart (approximately)
      const coord1: [number, number] = [-74.006, 40.7128];
      const coord2: [number, number] = [-74.0055, 40.7128]; // ~50m east
      
      const distance = calculateDistance(coord1, coord2);
      
      // Should be approximately 40-60 meters
      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(70);
    });

    it('is symmetric', () => {
      const coord1: [number, number] = [-74.006, 40.7128];
      const coord2: [number, number] = [-73.935, 40.7306];
      
      const distance1 = calculateDistance(coord1, coord2);
      const distance2 = calculateDistance(coord2, coord1);
      
      expect(Math.abs(distance1 - distance2)).toBeLessThan(0.001);
    });

    it('handles coordinates at different latitudes', () => {
      const coord1: [number, number] = [0, 0]; // Equator
      const coord2: [number, number] = [0, 1]; // 1 degree north
      
      const distance = calculateDistance(coord1, coord2);
      
      // 1 degree of latitude is approximately 111 km
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });
  });

  describe('findDuplicates', () => {
    it('finds listings with matching address and unit', async () => {
      // Create a listing
      const listing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Search for duplicates with same address
      const duplicates = await findDuplicates(
        '123 Main Street',
        '4B',
        [-74.006, 40.7128]
      );

      expect(duplicates.length).toBe(1);
      expect(duplicates[0]._id.toString()).toBe(listing._id.toString());
    });

    it('finds listings with normalized address variations', async () => {
      // Create a listing with abbreviated address
      await Listing.create({
        address: {
          street: '123 Main St',
          unit: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Search with full address form
      const duplicates = await findDuplicates(
        '123 Main Street',
        'Apartment 4B',
        [-74.006, 40.7128]
      );

      expect(duplicates.length).toBe(1);
    });

    it('does not find listings with different units', async () => {
      // Create a listing
      await Listing.create({
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Search for different unit
      const duplicates = await findDuplicates(
        '123 Main Street',
        '5A',
        [-74.006, 40.7128]
      );

      expect(duplicates.length).toBe(0);
    });

    it('does not find listings beyond distance threshold', async () => {
      // Create a listing
      await Listing.create({
        address: {
          street: '123 Main Street',
          unit: null,
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Search with coordinates far away (>50m)
      const duplicates = await findDuplicates(
        '123 Main Street',
        null,
        [-73.935, 40.7306] // Several km away
      );

      expect(duplicates.length).toBe(0);
    });

    it('finds listings within custom distance threshold', async () => {
      // Create a listing
      await Listing.create({
        address: {
          street: '123 Main Street',
          unit: null,
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Search with larger distance threshold
      const duplicates = await findDuplicates(
        '123 Main Street',
        null,
        [-74.0055, 40.7128], // ~50m away
        100 // 100m threshold
      );

      expect(duplicates.length).toBe(1);
    });
  });

  describe('mergeListing', () => {
    it('merges new source into existing listing', async () => {
      const listing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Original description',
        images: ['https://example.com/image1.jpg'],
        amenities: ['parking'],
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://streeteasy.com/listing/123',
          scrapedAt: new Date('2024-01-01')
        }],
        isActive: true
      });

      const originalCreatedAt = listing.createdAt;

      const newData = {
        price: 2100,
        description: 'Updated description',
        images: ['https://example.com/image2.jpg'],
        amenities: ['laundry'],
        sources: [{
          sourceName: 'Zillow',
          sourceId: 'zillow-456',
          sourceUrl: 'https://zillow.com/listing/456',
          scrapedAt: new Date('2024-01-02')
        }]
      };

      const merged = await mergeListing(listing, newData);

      // Verify sources merged
      expect(merged.sources.length).toBe(2);
      expect(merged.sources.some(s => s.sourceName === 'StreetEasy')).toBe(true);
      expect(merged.sources.some(s => s.sourceName === 'Zillow')).toBe(true);

      // Verify price updated
      expect(merged.price).toBe(2100);

      // Verify description updated
      expect(merged.description).toBe('Updated description');

      // Verify images merged
      expect(merged.images.length).toBe(2);
      expect(merged.images).toContain('https://example.com/image1.jpg');
      expect(merged.images).toContain('https://example.com/image2.jpg');

      // Verify amenities merged
      expect(merged.amenities.length).toBe(2);
      expect(merged.amenities).toContain('parking');
      expect(merged.amenities).toContain('laundry');

      // Verify createdAt preserved
      expect(merged.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it('preserves earliest createdAt when merging', async () => {
      const listing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: null,
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Test',
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      const originalCreatedAt = listing.createdAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const newData = {
        price: 2100,
        sources: [{
          sourceName: 'Zillow',
          sourceId: 'zillow-456',
          sourceUrl: 'https://zillow.com',
          scrapedAt: new Date()
        }]
      };

      const merged = await mergeListing(listing, newData);

      expect(merged.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });

    it('updates existing source scrapedAt if source already exists', async () => {
      const listing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: null,
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Test',
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date('2024-01-01')
        }],
        isActive: true
      });

      const newScrapedAt = new Date('2024-01-02');
      const newData = {
        price: 2100,
        sources: [{
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: newScrapedAt
        }]
      };

      const merged = await mergeListing(listing, newData);

      // Should still have only one source
      expect(merged.sources.length).toBe(1);
      
      // ScrapedAt should be updated
      expect(merged.sources[0].scrapedAt.getTime()).toBe(newScrapedAt.getTime());
    });

    it('handles conflicting data by using most recent', async () => {
      const listing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: null,
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        availableDate: new Date('2024-01-01'),
        bedrooms: 2,
        bathrooms: 1,
        squareFootage: 800,
        description: 'Old description',
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      const newData = {
        price: 2500,
        availableDate: new Date('2024-02-01'),
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1000,
        description: 'New description',
        petPolicy: {
          dogsAllowed: true,
          catsAllowed: true,
          petDeposit: 500
        },
        brokerFee: {
          required: true,
          amount: 2000
        },
        isActive: false,
        sources: [{
          sourceName: 'Zillow',
          sourceId: 'zillow-456',
          sourceUrl: 'https://zillow.com',
          scrapedAt: new Date()
        }]
      };

      const merged = await mergeListing(listing, newData);

      // All fields should be updated to new values
      expect(merged.price).toBe(2500);
      expect(merged.availableDate?.getTime()).toBe(new Date('2024-02-01').getTime());
      expect(merged.bedrooms).toBe(3);
      expect(merged.bathrooms).toBe(2);
      expect(merged.squareFootage).toBe(1000);
      expect(merged.description).toBe('New description');
      expect(merged.petPolicy.dogsAllowed).toBe(true);
      expect(merged.petPolicy.catsAllowed).toBe(true);
      expect(merged.petPolicy.petDeposit).toBe(500);
      expect(merged.brokerFee.required).toBe(true);
      expect(merged.brokerFee.amount).toBe(2000);
      expect(merged.isActive).toBe(false);
    });
  });

  describe('processListing', () => {
    it('creates new listing when no duplicates exist', async () => {
      const listingData = {
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point' as const,
            coordinates: [-74.006, 40.7128] as [number, number]
          }
        },
        price: 2000,
        bedrooms: 2,
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date()
        }],
        isActive: true
      };

      const result = await processListing(listingData);

      expect(result).toBeDefined();
      expect(result.address.street).toBe('123 Main Street');
      expect(result.sources.length).toBe(1);

      // Verify it was saved to database
      const count = await Listing.countDocuments();
      expect(count).toBe(1);
    });

    it('merges with existing listing when duplicate found', async () => {
      // Create existing listing
      const existing = await Listing.create({
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        },
        price: 2000,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Original',
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
          sourceName: 'StreetEasy',
          sourceId: 'test-123',
          sourceUrl: 'https://streeteasy.com',
          scrapedAt: new Date()
        }],
        isActive: true
      });

      // Process duplicate listing
      const duplicateData = {
        address: {
          street: '123 Main Street',
          unit: '4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point' as const,
            coordinates: [-74.006, 40.7128] as [number, number]
          }
        },
        price: 2100,
        bedrooms: 2,
        bathrooms: 1,
        description: 'Updated',
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
          sourceName: 'Zillow',
          sourceId: 'zillow-456',
          sourceUrl: 'https://zillow.com',
          scrapedAt: new Date()
        }],
        isActive: true
      };

      const result = await processListing(duplicateData);

      // Should be same document
      expect(result._id.toString()).toBe(existing._id.toString());

      // Should have both sources
      expect(result.sources.length).toBe(2);

      // Should have updated price
      expect(result.price).toBe(2100);

      // Should still only have one listing in database
      const count = await Listing.countDocuments();
      expect(count).toBe(1);
    });
  });
});
