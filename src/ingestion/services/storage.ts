import { ListingModel } from '../models';
import { NormalizedListing, Coordinates, ListingSource } from '../types';
import { unitAddressKey } from '../../utils/address';

export const sourceKey = (listing: Pick<NormalizedListing, 'source' | 'sourceId'>) => `${listing.source}:${listing.sourceId}`;

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
    try {
      const fields = listingFields(listing, coordinates);
      const fieldObservedAt = observedFields(fields, listing.scrapedAt);
      const saved = await ListingModel.create({ ...fields, fieldObservedAt,
        sourceKeys: [sourceKey(listing)], sources: [{ source: listing.source, sourceUrl: listing.sourceUrl, sourceId: listing.sourceId, firstSeenAt: listing.scrapedAt, lastSeenAt: listing.scrapedAt }], isActive: true,
      });
      return saved._id.toString();
    } catch (error: any) {
      // A concurrent import of the same source cannot create another listing.
      if (error.code !== 11000) throw error;
      const existing = await this.findBySourceId(listing.source, listing.sourceId);
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
      const reference = existing.sources.find(s => s.source === listing.source && s.sourceId === listing.sourceId);
      if (reference && reference.lastSeenAt >= listing.scrapedAt) return; // out-of-order observations cannot overwrite newer evidence
      const latestSeen = Math.max(0, ...existing.sources.map(s => new Date(s.lastSeenAt).getTime()).filter(Number.isFinite));
      if (listing.scrapedAt.getTime() >= latestSeen) {
        const fields = listingFields(listing, coordinates);
        existing.set('price.status', 'known');
        for (const [key, observedAt] of Object.entries(observedFields(fields, listing.scrapedAt))) existing.set(`fieldObservedAt.${key}`, observedAt);
        // Missing extraction fields must not erase previously observed values.
        for (const [key, value] of Object.entries(fields)) {
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
      existing.sourceKeys = [...new Set([...(existing.sourceKeys || []), sourceKey(listing)])];
      existing.isActive = true;
      try { await existing.save(); return; }
      catch (error: any) { if (error.name !== 'VersionError' || attempt === 2) throw error; }
    }
  }

  async findBySourceId(source: ListingSource, sourceId: string): Promise<any | null> {
    return ListingModel.findOne({ sources: { $elemMatch: { source, sourceId } } });
  }
  private async assertSourceNotQuarantined(listing: NormalizedListing): Promise<void> {
    if (await ListingModel.exists({ 'sourceConflicts.sourceKey': sourceKey(listing) })) {
      throw new Error('Source identity is quarantined; verify the unit before importing this source ID.');
    }
  }
  async findByAddress(address: string): Promise<any[]> { return ListingModel.find({ 'address.fullAddress': address }); }
  async markInactive(id: string): Promise<void> { await ListingModel.findByIdAndUpdate(id, { isActive: false }); }
  async markStaleListingsInactive(daysOld: number): Promise<number> {
    if (!Number.isFinite(daysOld) || daysOld <= 0) throw new Error('Stale threshold must be positive');
    const cutoff = new Date(Date.now() - daysOld * 86400000);
    // updatedAt may reflect a user or maintenance edit, not a source observation.
    const result = await ListingModel.updateMany({ isActive: true, sources: { $not: { $elemMatch: { lastSeenAt: { $gte: cutoff } } } } }, { $set: { isActive: false } });
    return result.modifiedCount;
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
