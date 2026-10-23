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
  it('blocks a quarantined source ID from insert and update without losing existing data', async () => {
    const data = await normalized('quarantined');
    const id = await storage.insertListing(data, null);
    await Listing.findByIdAndUpdate(id, { $push: { sourceConflicts: { sourceKey: 'streeteasy:quarantined', reason: 'Ambiguous unit owner' } } });
    await expect(storage.insertListing(data, null)).rejects.toThrow('quarantined');
    await expect(storage.updateListing(id, data, null)).rejects.toThrow('quarantined');
    expect(await Listing.countDocuments({})).toBe(1);
    expect((await Listing.findById(id))?.price.amount).toBe(4000);
  });
  it('counts stale evidence without hiding an unverified listing after a maintenance update', async () => {
    const id = await storage.insertListing(await normalized('old', {}, new Date('2020-01-01')), null);
    await Listing.findByIdAndUpdate(id, { description: 'Maintenance edit today' });
    expect(await storage.countStaleListings(3)).toBe(1);
    expect((await Listing.findById(id))!.isActive).toBe(true);
    expect((await SearchService.getListingById(id)).freshness).toBe('stale');
  });
  it('blocks retired source IDs even after a conflict has been resolved', async () => {
    const data = await normalized('retired');
    const id = await storage.insertListing(data, null);
    await Listing.findByIdAndUpdate(id, { sources: [], retiredSourceKeys: ['streeteasy:retired'], $unset: { sourceKeys: 1 } });
    await expect(storage.insertListing(data, null)).rejects.toThrow('quarantined');
    await expect(storage.updateListing(id, data, null)).rejects.toThrow('quarantined');
    expect(await Listing.countDocuments({})).toBe(1);
  });
  it('preserves verified building prices through search and rejects unit imports into the building', async () => {
    const data = await normalized('building');
    const id = await storage.insertListing(data, null);
    const building = await Listing.findById(id);
    building!.listingScope = 'building';
    building!.price = { amount: null, status: 'building', currency: 'USD', period: 'monthly' };
    building!.buildingRent = { status: 'range', minimum: 2500, maximum: 5000, sourceUrl: data.sourceUrl, observedAt: new Date() };
    await building!.save();
    await expect(storage.updateListing(id, await normalized('building', { price: 2500 }), null)).rejects.toThrow('unit import');
    const result = await SearchService.search({}, { page: 1, limit: 10 });
    expect(result.listings[0]).toMatchObject({ price: null, listingScope: 'building', buildingRent: { minimum: 2500, maximum: 5000 } });
    const bounded = await SearchService.search({ minPrice: 2000, maxPrice: 3000 }, { page: 1, limit: 10 });
    expect(bounded.total).toBe(0);
    await Listing.findByIdAndUpdate(id, { listingScope: 'unit', duplicateOf: 'historical-owner', 'price.status': 'unknown' });
    await expect(storage.updateListing(id, data, null)).rejects.toThrow('historical duplicate');
  });
  it('deduplicates canonical detail URLs even when extraction IDs change, including concurrent imports', async () => {
    const first = await normalized('url-first');
    const second = { ...await normalized('url-second'), sourceUrl: first.sourceUrl + '?utm_source=feed' };
    const ids = await Promise.all([storage.insertListing(first, null), storage.insertListing(second, null)]);
    expect(ids[0]).toBe(ids[1]);
    expect(await Listing.countDocuments()).toBe(1);
  });
  it('deduplicates concurrent observations of one explicit unit across sources', async () => {
    const first = await normalized('unit-race');
    const second = { ...await normalized('unit-race-other'), source: ListingSource.ZILLOW, sourceUrl: 'https://www.zillow.com/homedetails/unit-race' };
    const ids = await Promise.all([storage.insertListing(first, null), storage.insertListing(second, null)]);
    expect(new Set(ids).size).toBe(1);
    expect(await Listing.countDocuments()).toBe(1);
  });
  it('quarantines reused source identity instead of overwriting a different unit', async () => {
    const first = await normalized('reused', {}, new Date('2026-01-01'));
    const id = await storage.insertListing(first, null);
    await expect(storage.updateListing(id, await normalized('reused', { address: '230 West 55th St #9C, Manhattan, NY 10019', price: 9999 }), null)).rejects.toThrow('identity changed');
    const result = await SearchService.getListingById(id);
    expect(result.price).toBe(4000);
    expect(result.addressDetails.unit).toBe('8B');
    expect(result.sourceIdentityNeedsReview).toBe(true);
    expect(result.verificationState).toBe('unverified');
    // A renamed extraction ID cannot bypass the same listing's quarantine.
    await expect(storage.insertListing({ ...first, sourceId: 'renamed-reused', scrapedAt: new Date() }, null)).rejects.toThrow('quarantined');
  });
  it('refuses imports when legacy records share a detail URL', async () => {
    const first = await normalized('legacy-a');
    const id = await storage.insertListing(first, null);
    const original = await Listing.findById(id).lean();
    const { _id, sourceKeys, ...copy } = original!;
    await Listing.collection.insertOne({ ...copy, sources: [{ ...original!.sources[0], sourceId: 'legacy-b' }] });
    await expect(storage.insertListing({ ...first, sourceId: 'new-extraction-id' }, null)).rejects.toThrow('Multiple records');
    expect(await Listing.countDocuments()).toBe(2);
  });
  it('keeps missing-rent listings visible and stores their observed quote without a fake price', async () => {
    const id = await storage.insertListing(await normalized('quote', { price: '$2,500–$4,000' }), null);
    const result = await SearchService.getListingById(id);
    expect(result).toMatchObject({ price: null, rentNeedsReview: true, isActive: true, verificationState: 'unverified' });
    expect(result.rentEvidence.raw).toBe('$2,500–$4,000');
  });
  it('imports building ranges separately and clears an outdated range when a later extraction is missing', async () => {
    const first = await normalized('range', { listingScope: 'building', price: 2500, rentMinimum: 2500, rentMaximum: 4800 }, new Date('2026-01-01'));
    const id = await storage.insertListing(first, null);
    expect(await SearchService.getListingById(id)).toMatchObject({ price: null, listingScope: 'building', buildingRent: { minimum: 2500, maximum: 4800 } });
    await storage.updateListing(id, await normalized('range', { listingScope: 'building', price: null }), null);
    const current = await SearchService.getListingById(id);
    expect(current.price).toBeNull();
    expect(current.buildingRent).toBeUndefined();
  });
  it('replaces a prior building range with explicit contact pricing without retaining old bounds', async () => {
    const first = await normalized('contact-refresh', { listingScope: 'building', rentMinimum: 2500, rentMaximum: 4800 }, new Date('2026-01-01'));
    const id = await storage.insertListing(first, null);
    await storage.updateListing(id, await normalized('contact-refresh', { listingScope: 'building', contactForPrice: true, price: null }), null);
    const result = await SearchService.getListingById(id);
    expect(result.buildingRent).toMatchObject({ status: 'contact', minimum: null, maximum: null });
    expect(result.price).toBeNull();
    expect(result.rentEvidence.raw).toBeNull();
  });
  it('filters monthly unit budgets and sorts mixed periods by monthly equivalent with unknowns last', async () => {
    await storage.insertListing(await normalized('monthly-sort', { address: '101 Main St #1, Manhattan, NY 10019', price: 2800 }), null);
    await storage.insertListing(await normalized('weekly-sort', { address: '102 Main St #1, Manhattan, NY 10019', price: '$800/week' }), null);
    await storage.insertListing(await normalized('unknown-sort', { address: '103 Main St #1, Manhattan, NY 10019', price: null }), null);
    const bounded = await SearchService.search({ q: 'Main St', maxPrice: 3000 }, { limit: 19 });
    expect(bounded.listings.map(l => l.price)).toEqual([2800]);
    const sorted = await SearchService.search({ q: 'Main St' }, { sortBy: 'price', sortOrder: 'asc', limit: 19 });
    expect(sorted.listings.map(l => l.price)).toEqual([2800, 800, null]);
    const descending = await SearchService.search({ q: 'Main St' }, { sortBy: 'price', sortOrder: 'desc', limit: 19 });
    expect(descending.listings.map(l => l.price)).toEqual([800, 2800, null]);
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
  it('preserves missing rent as unknown and preserves unknown utility values including text false', async () => {
    expect((await normalized('missing', { price: null })).price).toMatchObject({ amount: null, status: 'unknown' });
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
