import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Listing } from '../../src/models/listing.model';

describe('Listing Model Validation', () => {
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

  // Helper function to create valid listing data
  const createValidListingData = () => ({
    address: {
      street: '123 Main St',
      unit: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      coordinates: {
        type: 'Point' as const,
        coordinates: [-73.935242, 40.730610] as [number, number]
      }
    },
    price: 2500,
    availableDate: new Date('2024-03-01'),
    bedrooms: 2,
    bathrooms: 1.5,
    squareFootage: 850,
    description: 'Beautiful apartment in Manhattan',
    images: ['https://example.com/image1.jpg'],
    amenities: ['laundry', 'doorman'],
    petPolicy: {
      dogsAllowed: true,
      catsAllowed: true,
      petDeposit: 500
    },
    brokerFee: {
      required: false,
      amount: null
    },
    sources: [{
      sourceName: 'StreetEasy',
      sourceId: 'se-12345',
      sourceUrl: 'https://streeteasy.com/listing/12345',
      scrapedAt: new Date()
    }],
    isActive: true
  });

  describe('Price Validation', () => {
    it('should reject negative price', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        price: -100
      });

      await expect(listing.save()).rejects.toThrow(/price/i);
    });

    it('should reject zero price', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        price: 0
      });

      await expect(listing.save()).rejects.toThrow(/price/i);
    });

    it('should provide descriptive error message for negative price', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        price: -500
      });

      try {
        await listing.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors.price).toBeDefined();
        expect(error.errors.price.message).toContain('positive');
      }
    });

    it('should accept positive price', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        price: 2500
      });

      const savedListing = await listing.save();
      expect(savedListing.price).toBe(2500);
    });
  });

  describe('Address Validation', () => {
    it('should reject empty street address', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          street: ''
        }
      });

      await expect(listing.save()).rejects.toThrow(/street/i);
    });

    it('should reject whitespace-only street address', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          street: '   '
        }
      });

      await expect(listing.save()).rejects.toThrow(/street/i);
    });

    it('should provide descriptive error message for empty street', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          street: ''
        }
      });

      try {
        await listing.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors['address.street']).toBeDefined();
        expect(error.errors['address.street'].message).toMatch(/street|empty|whitespace/i);
      }
    });

    it('should accept valid street address', async () => {
      const listing = new Listing(createValidListingData());
      const savedListing = await listing.save();
      expect(savedListing.address.street).toBe('123 Main St');
    });
  });

  describe('Coordinate Validation', () => {
    it('should reject latitude above 90', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [0, 95] as [number, number]
          }
        }
      });

      await expect(listing.save()).rejects.toThrow(/coordinate/i);
    });

    it('should reject latitude below -90', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [0, -95] as [number, number]
          }
        }
      });

      await expect(listing.save()).rejects.toThrow(/coordinate/i);
    });

    it('should reject longitude above 180', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [185, 0] as [number, number]
          }
        }
      });

      await expect(listing.save()).rejects.toThrow(/coordinate/i);
    });

    it('should reject longitude below -180', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [-185, 0] as [number, number]
          }
        }
      });

      await expect(listing.save()).rejects.toThrow(/coordinate/i);
    });

    it('should provide descriptive error message for invalid coordinates', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [200, 100] as [number, number]
          }
        }
      });

      try {
        await listing.save();
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.name).toBe('ValidationError');
        expect(error.errors['address.coordinates.coordinates']).toBeDefined();
        expect(error.errors['address.coordinates.coordinates'].message).toMatch(/coordinate|longitude|latitude/i);
      }
    });

    it('should accept valid coordinates at boundaries', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        address: {
          ...createValidListingData().address,
          coordinates: {
            type: 'Point' as const,
            coordinates: [-180, -90] as [number, number]
          }
        }
      });

      const savedListing = await listing.save();
      expect(savedListing.address.coordinates.coordinates).toEqual([-180, -90]);
    });

    it('should accept valid coordinates', async () => {
      const listing = new Listing(createValidListingData());
      const savedListing = await listing.save();
      expect(savedListing.address.coordinates.coordinates).toEqual([-73.935242, 40.730610]);
    });
  });

  describe('Required Fields Validation', () => {
    it('should reject missing address', async () => {
      const data: any = createValidListingData();
      delete data.address;
      const listing = new Listing(data);

      await expect(listing.save()).rejects.toThrow();
    });

    it('should reject missing price', async () => {
      const data: any = createValidListingData();
      delete data.price;
      const listing = new Listing(data);

      await expect(listing.save()).rejects.toThrow(/price/i);
    });

    it('should reject missing bedrooms', async () => {
      const data: any = createValidListingData();
      delete data.bedrooms;
      const listing = new Listing(data);

      await expect(listing.save()).rejects.toThrow(/bedroom/i);
    });

    it('should reject missing bathrooms', async () => {
      const data: any = createValidListingData();
      delete data.bathrooms;
      const listing = new Listing(data);

      await expect(listing.save()).rejects.toThrow(/bathroom/i);
    });

    it('should reject empty sources array', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        sources: []
      });

      await expect(listing.save()).rejects.toThrow(/source/i);
    });
  });

  describe('Bedrooms Validation', () => {
    it('should reject negative bedrooms', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bedrooms: -1
      });

      await expect(listing.save()).rejects.toThrow(/bedroom/i);
    });

    it('should accept zero bedrooms (studio)', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bedrooms: 0
      });

      const savedListing = await listing.save();
      expect(savedListing.bedrooms).toBe(0);
    });

    it('should reject non-integer bedrooms', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bedrooms: 2.5
      });

      await expect(listing.save()).rejects.toThrow(/bedroom/i);
    });
  });

  describe('Bathrooms Validation', () => {
    it('should reject zero bathrooms', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bathrooms: 0
      });

      await expect(listing.save()).rejects.toThrow(/bathroom/i);
    });

    it('should reject negative bathrooms', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bathrooms: -1
      });

      await expect(listing.save()).rejects.toThrow(/bathroom/i);
    });

    it('should accept fractional bathrooms', async () => {
      const listing = new Listing({
        ...createValidListingData(),
        bathrooms: 1.5
      });

      const savedListing = await listing.save();
      expect(savedListing.bathrooms).toBe(1.5);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set timestamps', async () => {
      const listing = await Listing.create(createValidListingData());

      expect(listing.createdAt).toBeInstanceOf(Date);
      expect(listing.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save but preserve createdAt', async () => {
      const listing = await Listing.create(createValidListingData());

      const originalCreatedAt = listing.createdAt;
      const originalUpdatedAt = listing.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      listing.price = 3000;
      await listing.save();

      expect(listing.createdAt).toEqual(originalCreatedAt);
      expect(listing.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const minimalData = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          coordinates: {
            type: 'Point' as const,
            coordinates: [-73.935242, 40.730610] as [number, number]
          }
        },
        price: 2500,
        bedrooms: 2,
        bathrooms: 1,
        sources: [{
          sourceName: 'StreetEasy',
          sourceId: 'se-12345',
          sourceUrl: 'https://streeteasy.com/listing/12345'
        }]
      };

      const listing = await Listing.create(minimalData);

      expect(listing.description).toBe('');
      expect(listing.images).toEqual([]);
      expect(listing.amenities).toEqual([]);
      expect(listing.petPolicy.dogsAllowed).toBe(false);
      expect(listing.petPolicy.catsAllowed).toBe(false);
      expect(listing.brokerFee.required).toBe(false);
      expect(listing.isActive).toBe(true);
    });
  });

  describe('Complete Valid Listing', () => {
    it('should accept and save a complete valid listing', async () => {
      const listingData = createValidListingData();
      const listing = await Listing.create(listingData);

      expect(listing._id).toBeDefined();
      expect(listing.address.street).toBe('123 Main St');
      expect(listing.price).toBe(2500);
      expect(listing.bedrooms).toBe(2);
      expect(listing.bathrooms).toBe(1.5);
      expect(listing.sources.length).toBe(1);
      expect(listing.createdAt).toBeInstanceOf(Date);
      expect(listing.updatedAt).toBeInstanceOf(Date);
    });
  });
});
