import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Listing } from '../../src/models/listing.model';
import { ListingModel } from '../../src/ingestion/models/listing.schema';
import { DataParser } from '../../src/ingestion/services/parser';
import { DataNormalizer } from '../../src/ingestion/services/normalizer';
import { ListingStorage } from '../../src/ingestion/services/storage';
import { DeduplicationEngine } from '../../src/ingestion/services/deduplication';
import { ListingSource } from '../../src/ingestion/types';
import { presentListing } from '../../src/utils/listing-presentation';
import { SearchService } from '../../src/services/search.service';
import { parseSearchQuery } from '../../src/api/routes/search.routes';
const storage = new ListingStorage();
const dedupe = new DeduplicationEngine();
async function normalized(id = 'example-1', changes: Record<string, unknown> = {}, seen = new Date()) {
  const parsed = await new DataParser().parse({ source: ListingSource.STREETEASY, sourceId: id, sourceUrl: `https://streeteasy.com/rental/${id}`, scrapedAt: seen, rawData: {
    address: '230 West 55th St #8B, Manhattan, NY 10019', price: 4000, bedrooms: 0, bathrooms: 1, squareFeet: 640,
    floorPlanImages: ['https://example.com/plan.jpg'], yearBuilt: 1979, leaseLength: '18 months', ...changes,
  } });
  return new DataNormalizer().normalize(parsed!);
}
describe('Ingestion to MongoDB to search', () => {
  let mongo: MongoMemoryServer;
  beforeAll(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); await Listing.init(); });
  afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
  beforeEach(async () => { await Listing.deleteMany({}); });
  it('shares one schema and retains unit, floor plan, area, and building details through the API', async () => {
    expect(ListingModel).toBe(Listing);
    const data = await normalized();
    const id = await storage.insertListing(data, null);
    const result = await SearchService.getListingById(id);
    expect(result).toMatchObject({ squareFeet: 640, bedrooms: 0, yearBuilt: 1979, leaseLength: '18 months', noFee: null, petsAllowed: null });
    expect(result.addressDetails.unit).toBe('8B');
    expect(result.floorPlanImages).toEqual(['https://example.com/plan.jpg']);
    expect(result.freshness).toBe('recent');
    expect(result.utilities.water).toBeNull();
  });
  it('refreshes source observation time, preserves first seen and missing values, and ignores older imports', async () => {
    const first = await normalized('refresh', {}, new Date('2026-01-01'));
    const id = await storage.insertListing(first, { latitude: 40.76, longitude: -73.98 });
    const second = await normalized('refresh', { price: 4200, squareFeet: null, yearBuilt: null, floorPlanImages: [] }, new Date('2026-02-01'));
    await storage.updateListing(id, second, null);
    await storage.updateListing(id, first, null);
    const result = await SearchService.getListingById(id);
    expect(result.price).toBe(4200);
    expect(result.squareFeet).toBe(640);
    expect(result.yearBuilt).toBe(1979);
    expect(result.floorPlanImages).toHaveLength(1);
    expect(result.addressDetails.coordinates.coordinates).toEqual([-73.98, 40.76]);
    expect(result.sources[0].firstSeenAt).toEqual(new Date('2026-01-01'));
    expect(result.sources[0].lastSeenAt).toEqual(new Date('2026-02-01'));
  });
  it('never merges different or unidentified apartments in the same building', async () => {
    const first = await normalized();
    await storage.insertListing(first, null);
    expect(await dedupe.findDuplicate(await normalized('different', { address: '230 W 55 St #8C, Manhattan, NY 10019' }))).toBeNull();
    expect(await dedupe.findDuplicate(await normalized('unknown', { address: '230 W 55 St, Manhattan, NY 10019' }))).toBeNull();
    expect(await dedupe.findDuplicate(await normalized('same', { address: '230 W. 55 St Apt 8B, New York, NY 10019' }))).not.toBeNull();
  });
  it('pairs source and ID within the same array element', async () => {
    const id = await storage.insertListing(await normalized('a'), null);
    await Listing.findByIdAndUpdate(id, { $push: { sources: { source: 'zillow', sourceId: 'b', sourceUrl: 'https://zillow.com/b', firstSeenAt: new Date(), lastSeenAt: new Date() } } });
    expect(await storage.findBySourceId(ListingSource.STREETEASY, 'b')).toBeNull();
  });
  it('handles concurrent insertions without creating duplicate source records', async () => {
    const data = await normalized('race');
    const ids = await Promise.all([storage.insertListing(data, null), storage.insertListing(data, null)]);
    expect(ids[0]).toBe(ids[1]);
    expect(await Listing.countDocuments({})).toBe(1);
  });
  it('bases expiry on source evidence even after a maintenance update', async () => {
    const id = await storage.insertListing(await normalized('old', {}, new Date('2020-01-01')), null);
    await Listing.findByIdAndUpdate(id, { description: 'Maintenance edit today' });
    expect(await storage.markStaleListingsInactive(3)).toBe(1);
    expect((await Listing.findById(id))!.isActive).toBe(false);
  });
  it('passes exact studio, fee, and search text filters through to MongoDB', async () => {
    await storage.insertListing(await normalized('studio', { brokerFee: 'No fee' }), null);
    await storage.insertListing(await normalized('one-bed', { bedrooms: 1, address: '231 West 55th St #8B, Manhattan, NY 10019' }), null);
    const { filters, options } = parseSearchQuery({ minBedrooms: '0', maxBedrooms: '0', q: '230 West', noFee: 'true', neighborhoods: 'Manhattan' });
    const result = await SearchService.search(filters, options);
    expect(result.total).toBe(1);
    expect(result.listings[0].bedrooms).toBe(0);
  });
});

describe('Normalization and honest presentation', () => {
  it('does not parse not allowed as pet-friendly or missing policies as false', async () => {
    expect((await normalized('pets', { petPolicy: 'Pets not allowed' })).petPolicy?.allowed).toBe(false);
    expect((await normalized('pets2', { petPolicy: 'Ask management' })).petPolicy?.allowed).toBeNull();
    expect((await normalized('pets3', { petPolicy: null })).petPolicy).toBeNull();
  });
  it('rejects missing rent and preserves unknown utility values including text false', async () => {
    await expect(normalized('missing', { price: null })).rejects.toThrow('positive rent');
    const listing = await normalized('utilities', { utilities: { water: true, gas: 'false' } });
    expect(listing.utilities).toMatchObject({ water: true, gas: null, electric: null });
  });
  it('retains legitimate zeros but rejects invalid dates and infinite data', async () => {
    const data = await normalized('dates', { availableDate: 'not a date', bedrooms: 0, squareFeet: Infinity });
    expect(data.availableDate).toBeNull();
    expect(data.bedrooms).toBe(0);
    expect(data.squareFeet).toBeNull();
  });
  it('reads legacy area and uses source time rather than updatedAt for freshness', () => {
    const listing = presentListing({ squareFeet: 700, price: { amount: 2000 }, updatedAt: new Date(), sources: [{ source: 'streeteasy', lastSeenAt: '2020-01-01' }] });
    expect(listing.squareFeet).toBe(700);
    expect(listing.freshness).toBe('stale');
    expect(listing.noFee).toBeNull();
    expect(presentListing({}).freshness).toBe('unknown');
  });
  it.each([{ page: '-1' }, { limit: '999' }, { minPrice: 'NaN' }, { minPrice: '5000', maxPrice: '2000' }, { sortBy: '$where' }, { minBedrooms: '0.5' }])('rejects invalid search input %s', query => {
    expect(() => parseSearchQuery(query)).toThrow();
  });
});
