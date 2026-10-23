/** Read-only audit. Never merges, deletes, or changes production records. */
import 'dotenv/config';
import { sourceDetailKey } from '../src/utils/source-identity';
import mongoose from 'mongoose';
import { splitUnit, unitAddressKey } from '../src/utils/address';

async function audit() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI to the database to audit. This script is read-only.');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  const collection = mongoose.connection.collection('listings');
  const summary = { total: 0, legacyArea: 0, legacyCoordinates: 0, missingSourceDate: 0, stale: 0, missingUnit: 0, missingAddressKey: 0, unverifiedFee: 0, invalidRent: 0, unknownRent: 0, sourceIdentityNeedsReview: 0, buildingRentRanges: 0, contactForPrice: 0, historicalDuplicates: 0, sourceMismatches: 0 };
  const urlOwners = new Map<string, Set<string>>();
  const sourceOwners = new Map<string, string[]>();
  for await (const listing of collection.find({})) {
    summary.total++;
    if (listing.squareFootage == null && listing.squareFeet != null) summary.legacyArea++;
    if (!listing.address?.coordinates && listing.coordinates) summary.legacyCoordinates++;
    if (!listing.address?.unit && !splitUnit(listing.address?.street || '').unit) summary.missingUnit++;
    if (unitAddressKey(listing.address || { street: '' }) && !listing.addressKey) summary.missingAddressKey++;
    if (!listing.fieldObservedAt?.brokerFee_required) summary.unverifiedFee++;
    if (listing.duplicateOf) summary.historicalDuplicates++;
    if (listing.sourceVerification?.status === 'source_mismatch') summary.sourceMismatches++;
    if (listing.price?.status === 'building' && listing.buildingRent?.status === 'range' && listing.buildingRent.minimum > 0 && listing.buildingRent.maximum >= listing.buildingRent.minimum) summary.buildingRentRanges++;
    else if (listing.price?.status === 'building' && listing.buildingRent?.status === 'contact') summary.contactForPrice++;
    else if (listing.price?.status === 'unknown' && listing.price.amount == null) summary.unknownRent++;
    else if (!Number.isFinite(listing.price?.amount) || listing.price.amount <= 0) summary.invalidRent++;
    if (listing.sourceConflicts?.length) summary.sourceIdentityNeedsReview++;
    const times = (listing.sources || []).map((source: any) => Date.parse(source.lastSeenAt || source.scrapedAt)).filter(Number.isFinite);
    if (!times.length) summary.missingSourceDate++;
    else if (Math.max(...times) < Date.now() - 72 * 3600000) summary.stale++;
    for (const source of listing.sources || []) {
      const name = source.source || source.sourceName;
      if (!name || !source.sourceId) continue;
      const urlKey = sourceDetailKey(name, source.sourceUrl || '');
      if (urlKey) { const owners = urlOwners.get(urlKey) || new Set<string>(); owners.add(String(listing._id)); urlOwners.set(urlKey, owners); }
      const key = `${name}:${source.sourceId}`;
      const ids = sourceOwners.get(key) || [];
      if (!ids.includes(String(listing._id))) ids.push(String(listing._id));
      sourceOwners.set(key, ids);
    }
  }
  const duplicateSources = [...sourceOwners].filter(([, ids]) => ids.length > 1).map(([sourceKey, listingIds]) => ({ sourceKey, listingIds }));
  console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true, summary, duplicateSources, duplicateDetailUrls: [...urlOwners].filter(([, owners]) => owners.size > 1).map(([url, owners]) => ({ url, listingIds: [...owners] })), nextSteps: [
    'Review duplicate source IDs before merging. Keep the survivor ID used by saved listings and alert history; remap references before removing anything.',
    'Reimport source records to establish missing field observations. Do not backdate unknown fees or utility policies.',
    'Canonical reads support legacy squareFeet and coordinates. Missing unit identities cannot safely be inferred from price or location.',
  ] }, null, 2));
}
audit().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
