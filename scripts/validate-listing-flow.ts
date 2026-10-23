/** Read real API observations, replay only in an isolated temporary database. */
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DataParser } from '../src/ingestion/services/parser';
import { DataNormalizer } from '../src/ingestion/services/normalizer';
import { ListingStorage } from '../src/ingestion/services/storage';
import { Listing } from '../src/models/listing.model';
import { SearchService } from '../src/services/search.service';
import { ListingSource } from '../src/ingestion/types';
import { sourceDetailKey } from '../src/utils/source-identity';

async function main() {
  const response = await fetch(`${process.env.VALIDATION_API_URL || 'http://localhost:3001'}/api/search?limit=24`);
  assert(response.ok, `Live search returned ${response.status}`);
  const { listings } = await response.json() as any;
  assert(listings.length > 0, 'No live observations to replay');
  const mongo = await MongoMemoryServer.create();
  try {
    await mongoose.connect(mongo.getUri());
    await Listing.init();
    const storage = new ListingStorage();
    const urls = new Set<string>();
    let replayed = 0;
    for (const listing of listings) {
      const source = listing.sources?.[0];
      if (!source || !sourceDetailKey(source.source, source.sourceUrl) || !listing.addressDetails) continue;
      const parsed = await new DataParser().parse({ source: source.source as ListingSource, sourceId: source.sourceId, sourceUrl: source.sourceUrl, scrapedAt: new Date(source.lastSeenAt || source.scrapedAt), rawData: {
        address: listing.address, price: listing.price, pricePeriod: listing.pricePeriod, bedrooms: listing.bedrooms, bathrooms: listing.bathrooms, squareFeet: listing.squareFeet,
        listingScope: listing.listingScope, rentMinimum: listing.buildingRent?.minimum, rentMaximum: listing.buildingRent?.maximum, contactForPrice: listing.buildingRent?.status === 'contact',
      } });
      const normalized = await new DataNormalizer().normalize(parsed!);
      const id = await storage.insertListing(normalized, null);
      const repeated = await storage.insertListing({ ...normalized, sourceId: `re-extracted:${source.sourceId}`, sourceUrl: source.sourceUrl.split('?')[0] + '?utm_source=validation' }, null);
      assert.equal(id, repeated, 'Tracking parameters or changed extraction IDs created a duplicate');
      const result = await SearchService.getListingById(id);
      if (+new Date(result.lastSeenAt) === +new Date(source.lastSeenAt || source.scrapedAt)) assert.equal(result.price, listing.listingScope === 'building' ? null : listing.price);
      assert.equal(result.verificationState, 'unverified', 'Replay must not invent source verification');
      assert(+new Date(result.lastSeenAt) >= +new Date(source.lastSeenAt || source.scrapedAt), 'Replay regressed source freshness');
      urls.add(sourceDetailKey(source.source, source.sourceUrl)!); replayed++;
    }
    assert(replayed > 0);
    const count = await Listing.countDocuments();
    assert(count <= urls.size, 'More stored records than source identities');
    const search = await SearchService.search({}, { limit: 100 });
    assert.equal(search.total, count);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), liveObservationsReplayed: replayed, uniqueDetailUrls: urls.size, isolatedListings: count, duplicateReplayAttempts: replayed, productionWrites: 0, passed: true }, null, 2));
  } finally { await mongoose.disconnect(); await mongo.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
