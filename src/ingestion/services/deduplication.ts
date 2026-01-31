import { NormalizedListing } from '../types';
import { ListingModel } from '../models';

/**
 * Deduplication engine for identifying and merging duplicate listings
 */
export class DeduplicationEngine {
  /**
   * Find duplicate listing in database
   */
  async findDuplicate(listing: NormalizedListing): Promise<string | null> {
    // 1. Exact match by source and sourceId
    const exactMatch = await ListingModel.findOne({
      'sources.source': listing.source,
      'sources.sourceId': listing.sourceId,
    });

    if (exactMatch) {
      return exactMatch._id.toString();
    }

    // 2. Address match
    const addressMatch = await ListingModel.findOne({
      'address.fullAddress': listing.address.fullAddress,
    });

    if (addressMatch) {
      return addressMatch._id.toString();
    }

    // 3. Fuzzy match (address similarity + price tolerance + bed/bath match)
    const fuzzyMatches = await ListingModel.find({
      'address.city': listing.address.city,
      'address.state': listing.address.state,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
    });

    for (const match of fuzzyMatches) {
      if (this.isFuzzyMatch(listing, match)) {
        return match._id.toString();
      }
    }

    return null;
  }

  /**
   * Merge new listing data with existing listing
   */
  async mergeListing(existingId: string, newListing: NormalizedListing): Promise<void> {
    const existing = await ListingModel.findById(existingId);
    if (!existing) return;

    // Add new source reference if not already present
    const sourceExists = existing.sources.some(
      s => s.source === newListing.source && s.sourceId === newListing.sourceId
    );

    if (!sourceExists) {
      existing.sources.push({
        source: newListing.source,
        sourceUrl: newListing.sourceUrl,
        sourceId: newListing.sourceId,
        firstSeenAt: newListing.scrapedAt,
        lastSeenAt: newListing.scrapedAt,
      });
    } else {
      // Update lastSeenAt for existing source
      const sourceRef = existing.sources.find(
        s => s.source === newListing.source && s.sourceId === newListing.sourceId
      );
      if (sourceRef) {
        sourceRef.lastSeenAt = newListing.scrapedAt;
      }
    }

    // Update fields with most recent non-null values
    if (newListing.price.amount) existing.price = newListing.price;
    if (newListing.bedrooms !== null) existing.bedrooms = newListing.bedrooms;
    if (newListing.bathrooms !== null) existing.bathrooms = newListing.bathrooms;
    if (newListing.squareFeet !== null) existing.squareFeet = newListing.squareFeet;
    if (newListing.description) existing.description = newListing.description;
    if (newListing.images.length > 0) existing.images = newListing.images;
    if (newListing.amenities.length > 0) existing.amenities = newListing.amenities;
    if (newListing.petPolicy) existing.petPolicy = newListing.petPolicy;
    if (newListing.brokerFee) existing.brokerFee = newListing.brokerFee;

    // Keep isActive true if seen recently
    existing.isActive = true;

    await existing.save();
  }

  /**
   * Check if two listings are fuzzy matches
   */
  private isFuzzyMatch(listing1: NormalizedListing, listing2: any): boolean {
    // Address similarity
    const addressSimilarity = this.calculateStringSimilarity(
      listing1.address.fullAddress,
      listing2.address.fullAddress
    );

    if (addressSimilarity < 0.9) return false;

    // Price tolerance (within 5%)
    const price1 = listing1.price.amount;
    const price2 = listing2.price.amount;
    if (price1 && price2) {
      const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2);
      if (priceDiff > 0.05) return false;
    }

    // Bed/bath must match
    if (listing1.bedrooms !== listing2.bedrooms) return false;
    if (listing1.bathrooms !== listing2.bathrooms) return false;

    return true;
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
