import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ListingModel } from './listing.schema';
import { ListingSource } from '../types';

describe('Listing Schema', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should create a valid listing with all required fields', async () => {
    const listing = new ListingModel({
      sources: [{
        source: ListingSource.STREETEASY,
        sourceUrl: 'https://streeteasy.com/listing/123',
        sourceId: '123',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }],
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        fullAddress: '123 Main St, New York, NY 10001',
      },
      price: {
        amount: 2500,
        currency: 'USD',
        period: 'monthly',
      },
      images: [],
      amenities: [],
    });

    const saved = await listing.save();
    expect(saved._id).toBeDefined();
    expect(saved.isActive).toBe(true);
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });

  it('should create a listing with optional fields', async () => {
    const listing = new ListingModel({
      sources: [{
        source: ListingSource.ZILLOW,
        sourceUrl: 'https://zillow.com/listing/456',
        sourceId: '456',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }],
      address: {
        street: '456 Oak Ave',
        city: 'Brooklyn',
        state: 'NY',
        zipCode: '11201',
        fullAddress: '456 Oak Ave, Brooklyn, NY 11201',
      },
      price: {
        amount: 3000,
        currency: 'USD',
        period: 'monthly',
      },
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      description: 'Nice apartment',
      images: ['https://example.com/img1.jpg'],
      amenities: ['Air Conditioning', 'Dishwasher'],
      petPolicy: {
        allowed: true,
        restrictions: 'Small dogs only',
        deposit: 500,
      },
      brokerFee: {
        required: true,
        amount: null,
        percentage: 15,
      },
    });

    const saved = await listing.save();
    expect(saved.bedrooms).toBe(2);
    expect(saved.bathrooms).toBe(1);
    expect(saved.petPolicy?.allowed).toBe(true);
    expect(saved.brokerFee?.percentage).toBe(15);
  });

  it('should create a listing with coordinates', async () => {
    const listing = new ListingModel({
      sources: [{
        source: ListingSource.APARTMENTS_COM,
        sourceUrl: 'https://apartments.com/listing/789',
        sourceId: '789',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }],
      address: {
        street: '789 Park Ave',
        city: 'Manhattan',
        state: 'NY',
        zipCode: '10021',
        fullAddress: '789 Park Ave, Manhattan, NY 10021',
      },
      price: {
        amount: 4000,
        currency: 'USD',
        period: 'monthly',
      },
      coordinates: {
        type: 'Point',
        coordinates: [-73.9712, 40.7831], // [longitude, latitude]
      },
      images: [],
      amenities: [],
    });

    const saved = await listing.save();
    expect(saved.coordinates?.type).toBe('Point');
    expect(saved.coordinates?.coordinates).toEqual([-73.9712, 40.7831]);
  });

  it('should fail validation without required fields', async () => {
    const listing = new ListingModel({
      sources: [],
      // Missing address and price
    });

    await expect(listing.save()).rejects.toThrow();
  });

  it('should fail validation with empty sources array', async () => {
    const listing = new ListingModel({
      sources: [],
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        fullAddress: '123 Main St, New York, NY 10001',
      },
      price: {
        amount: 2500,
        currency: 'USD',
        period: 'monthly',
      },
      images: [],
      amenities: [],
    });

    await expect(listing.save()).rejects.toThrow();
  });
});
