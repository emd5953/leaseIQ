import { ListingModel } from '../models';
import { NormalizedListing, Coordinates, ListingSource } from '../types';
import { unitAddressKey, normalizeStreet, normalizeCity } from '../../utils/address';
import { sourceDetailKey, canonicalSourceUrl } from '../../utils/source-identity';

export const sourceKey = (listing: Pick<NormalizedListing, 'source' | 'sourceId'>) => `${listing.source}:${listing.sourceId}`;
const identityKeys = (listing: NormalizedListing) => [sourceKey(listing), sourceDetailKey(listing.source, listing.sourceUrl), ...(unitAddressKey(listing.address) ? [`unit:${unitAddressKey(listing.address)}`] : [])].filter((key): key is string => !!key);

export function listingFields(listing: NormalizedListing, coordinates: Coordinates | null) {
  const { source, sourceUrl, sourceId, scrapedAt, squareFeet, ...fields } = listing;
  const address = { ...listing.address, ...(coordinates ? { coordinates: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] } } : {}) };
  return { ...fields, dataVersion: 2, address, addressKey: unitAddressKey(address), squareFootage: squareFeet,
    petPolicy: listing.petPolicy ? { allowed: listing.petPolicy.allowed, dogsAllowed: listing.petPolicy.dogsAllowed, catsAllowed: listing.petPolicy.catsAllowed, restrictions: listing.petPolicy.restrictions, petDeposit: listing.petPolicy.deposit } : undefined,
  };
}

export class ListingStorage {
  async insertListing(listing: NormalizedListing, coordinates: Coordinates | null): Promise<string> {
    await this.assertSourceNotQuarantined(listing);
    const owner = await this.findSourceOwner(listing);
    if (owner) { await this.updateListing(owner._id.toString(), listing, coordinates); return owner._id.toString(); }
    try {
      const fields = listingFields(listing, coordinates);
      const fieldObservedAt = observedFields(fields, listing.scrapedAt);
      const saved = await ListingModel.create({ ...fields, fieldObservedAt,
        sourceKeys: identityKeys(listing), sources: [{ source: listing.source, sourceUrl: listing.sourceUrl, sourceId: listing.sourceId, firstSeenAt: listing.scrapedAt, lastSeenAt: listing.scrapedAt }], isActive: true,
      });
      return saved._id.toString();
    } catch (error: any) {
      // A concurrent import of the same source cannot create another listing.
      if (error.code !== 11000) throw error;
      const existing = await this.findSourceOwner(listing);
      if (!existing) throw error;
      await this.updateListing(existing._id.toString(), listing, coordinates);
      return existing._id.toString();
    }
  }

  async updateListing(id: string, listing: NormalizedListing, coordinates: Coordinates | null): Promise<void> {
    await this.assertSourceNotQuarantined(listing);
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await ListingModel.findById(id);
      if (!existing) throw new Error('Listing disappeared during import');
      if (existing.sourceConflicts?.length || existing.sourceVerification?.status === 'source_mismatch') throw new Error('Listing identity is quarantined; resolve the source conflict before importing.');
      if (existing.listingScope === 'building' && listing.listingScope !== 'building' || existing.duplicateOf) throw new Error('A unit import cannot overwrite a verified building or historical duplicate.');
      const reference = existing.sources.find(s => s.source === listing.source && s.sourceId === listing.sourceId);
      if (reference && reference.lastSeenAt >= listing.scrapedAt) return; // out-of-order observations cannot overwrite newer evidence
      const a = existing.address, b = listing.address;
      const changed = normalizeStreet(a.street) !== normalizeStreet(b.street)
        || a.city && b.city && normalizeCity(a.city) !== normalizeCity(b.city)
        || a.zipCode && b.zipCode && a.zipCode !== b.zipCode
        || a.unit && b.unit && a.unit.toUpperCase() !== b.unit.toUpperCase()
        || reference && sourceDetailKey(listing.source, reference.sourceUrl) && sourceDetailKey(listing.source, listing.sourceUrl) !== sourceDetailKey(listing.source, reference.sourceUrl);
      if (changed) {
        await ListingModel.updateOne({ _id: id }, { $addToSet: { sourceConflicts: { sourceKey: sourceKey(listing), source: reference || { source: listing.source, sourceId: listing.sourceId, sourceUrl: listing.sourceUrl }, incoming: { address: listing.address, sourceUrl: listing.sourceUrl, observedAt: listing.scrapedAt }, quarantinedAt: new Date(), reason: 'Incoming source identity disagrees with the stored address, unit or detail URL.' } } });
        throw new Error('Source identity changed; incoming observation quarantined for review.');
      }
      const latestSeen = Math.max(0, ...existing.sources.map(s => new Date(s.lastSeenAt).getTime()).filter(Number.isFinite));
      if (listing.scrapedAt.getTime() >= latestSeen) {
        const fields = listingFields(listing, coordinates);
        // These objects encode explicit unknown/contact states. Replace them
        // atomically so a null quote cannot retain an older amount or range.
        existing.set('price', listing.price);
        if (listing.listingScope === 'building') existing.set('buildingRent', listing.buildingRent);
        if (listing.rentEvidence) existing.set('rentEvidence', listing.rentEvidence);
        existing.set('sourceVerification', { status: 'unverified', checkedAt: listing.scrapedAt, reason: 'Imported source observation; primary page identity has not been independently checked.' });
        for (const [key, observedAt] of Object.entries(observedFields(fields, listing.scrapedAt))) existing.set(`fieldObservedAt.${key}`, observedAt);
        // Missing extraction fields must not erase previously observed values.
        for (const [key, value] of Object.entries(fields)) {
          if (['price', 'buildingRent', 'rentEvidence'].includes(key)) continue;
          if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            for (const [nested, item] of Object.entries(value)) {
              if (item != null && item !== '') existing.set(`${key}.${nested}`, item);
            }
          } else existing.set(key, value);
        }
      }
      if (reference) { reference.lastSeenAt = listing.scrapedAt; reference.sourceUrl = listing.sourceUrl; }
      else existing.sources.push({ source: listing.source, sourceUrl: listing.sourceUrl, sourceId: listing.sourceId, firstSeenAt: listing.scrapedAt, lastSeenAt: listing.scrapedAt });
      existing.sourceKeys = [...new Set([...(existing.sourceKeys || []), ...identityKeys(listing)])];
      existing.isActive = true;
      try { await existing.save(); return; }
      catch (error: any) { if (error.name !== 'VersionError' || attempt === 2) throw error; }
    }
  }

  async findBySourceId(source: ListingSource, sourceId: string): Promise<any | null> {
    return ListingModel.findOne({ sources: { $elemMatch: { source, sourceId } } });
  }
  async findSourceOwner(listing: NormalizedListing): Promise<any | null> {
    const key = sourceDetailKey(listing.source, listing.sourceUrl);
    const clauses: any[] = [{ sourceKeys: { $in: identityKeys(listing) } }, { sources: { $elemMatch: { source: listing.source, sourceId: listing.sourceId } } }];
    if (key) {
      const canonical = canonicalSourceUrl(listing.source, listing.sourceUrl)!;
      const escaped = canonical.replace(/^https:\/\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      clauses.push({ sources: { $elemMatch: { source: listing.source, sourceUrl: { $regex: `^https?://(?:www\\.)?${escaped}/?(?:[?#].*)?$` } } } });
    }
    const matches = await ListingModel.find({ $or: clauses }).limit(2);
    if (matches.length > 1) throw new Error('Multiple records own this source identity; repair required before importing.');
    return matches[0] || null;
  }
  private async assertSourceNotQuarantined(listing: NormalizedListing): Promise<void> {
    if (await ListingModel.exists({ $or: [{ 'sourceConflicts.sourceKey': sourceKey(listing) }, { retiredSourceKeys: sourceKey(listing) }] })) {
      throw new Error('Source identity is quarantined; verify the unit before importing this source ID.');
    }
  }
  async findByAddress(address: string): Promise<any[]> { return ListingModel.find({ 'address.fullAddress': address }); }
  async markInactive(id: string): Promise<void> { await ListingModel.findByIdAndUpdate(id, { isActive: false }); }
  async countStaleListings(daysOld: number): Promise<number> {
    if (!Number.isFinite(daysOld) || daysOld <= 0) throw new Error('Stale threshold must be positive');
    const cutoff = new Date(Date.now() - daysOld * 86400000);
    // Age is uncertainty, not evidence that a rental was withdrawn. Keep stale
    // records visible; presentation derives the warning from source dates.
    return ListingModel.countDocuments({ isActive: true, sources: { $not: { $elemMatch: { lastSeenAt: { $gte: cutoff, $lte: new Date() } } } } });
  }
}

function observedFields(fields: Record<string, any>, observedAt: Date): Record<string, Date> {
  const dates: Record<string, Date> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (['dataVersion', 'addressKey'].includes(key) || value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [nested, item] of Object.entries(value)) if (item != null && item !== '') dates[`${key}_${nested}`] = observedAt;
    } else dates[key] = observedAt;
  }
  return dates;
}
