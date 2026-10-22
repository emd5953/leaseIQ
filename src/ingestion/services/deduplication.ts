import { NormalizedListing } from '../types';
import { ListingModel } from '../models';
import { unitAddressKey } from '../../utils/address';
import { ListingStorage } from './storage';

export class DeduplicationEngine {
  async findDuplicate(listing: NormalizedListing): Promise<string | null> {
    const exact = await ListingModel.findOne({ sources: { $elemMatch: { source: listing.source, sourceId: listing.sourceId } } });
    if (exact) return exact._id.toString();
    // A building address alone is not a unit identity. Fuzzy price/address matches
    // can merge neighboring apartments; only merge an explicit matching unit.
    const addressKey = unitAddressKey(listing.address);
    if (!addressKey) return null;
    const matches = await ListingModel.find({ addressKey }).limit(2);
    return matches.length === 1 ? matches[0]._id.toString() : null;
  }
  async mergeListing(existingId: string, newListing: NormalizedListing): Promise<void> {
    await new ListingStorage().updateListing(existingId, newListing, null);
  }
}
