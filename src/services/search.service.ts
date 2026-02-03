import { Listing } from '../models';
import { buildListingQuery } from '../utils/queries';

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  neighborhoods?: string[];
  petsAllowed?: boolean;
  noFee?: boolean;
  amenities?: string[];
  minSquareFeet?: number;
  maxSquareFeet?: number;
  availableFrom?: Date;
  availableTo?: Date;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'bedrooms' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  listings: any[];
  total: number;
  page: number;
  totalPages: number;
}

// Simple in-memory cache
interface CacheEntry {
  data: SearchResult;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes - shorter cache for faster listing updates

function getCacheKey(filters: SearchFilters, options: SearchOptions): string {
  return JSON.stringify({ filters, options });
}

function getCachedResult(key: string): SearchResult | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedResult(key: string, data: SearchResult): void {
  searchCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries (keep cache size reasonable)
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
}

export class SearchService {
  /**
   * Transform listing data for frontend consumption
   * Converts address object to string and flattens nested structures
   */
  private static transformListing(listing: any): any {
    if (!listing) return null;

    // Format address as a string
    const addressParts = [
      listing.address?.street,
      listing.address?.unit,
      listing.address?.city,
      listing.address?.state,
      listing.address?.zipCode
    ].filter(Boolean);
    
    const addressString = addressParts.join(', ');

    // Flatten price - handle both object and number formats
    const price = typeof listing.price === 'object' && listing.price !== null
      ? listing.price.amount
      : listing.price;

    // Flatten pet policy
    const petsAllowed = listing.petPolicy?.dogsAllowed || listing.petPolicy?.catsAllowed || false;

    // Flatten broker fee
    const noFee = !listing.brokerFee?.required;

    // Get primary source
    const source = listing.sources?.[0]?.source || 'Unknown';
    const sourceUrl = listing.sources?.[0]?.sourceUrl || null;

    // Get square footage
    const squareFeet = listing.squareFootage;

    // Generate title from address and bedrooms
    const bedroomText = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} Bedroom`;
    const title = `${bedroomText} in ${listing.address?.city || listing.address?.street || 'NYC'}`;

    return {
      ...listing,
      title,
      address: addressString,
      price,
      petsAllowed,
      noFee,
      source,
      sourceUrl,
      squareFeet,
      // Keep original address object for map functionality if needed
      addressDetails: listing.address,
    };
  }

  static async search(filters: SearchFilters, options: SearchOptions = {}): Promise<SearchResult> {
    // Check cache first
    const cacheKey = getCacheKey(filters, options);
    const cached = getCachedResult(cacheKey);
    if (cached) {
      console.log('Cache hit for search query');
      return cached;
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    // Build query from filters
    const query = buildListingQuery(filters);

    // Add NYC-only filter - simplified for better index usage
    query['address.state'] = { $in: ['NY', 'New York'] };
    query.isActive = true; // Only show active listings

    // Build sort - handle nested price field
    const baseSortField = options.sortBy || 'createdAt';
    const sortField: string = baseSortField === 'price' ? 'price.amount' : baseSortField;
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Execute query with timeout and optimized projection
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('address price bedrooms bathrooms squareFootage images sources petPolicy brokerFee amenities createdAt')
        .lean()
        .maxTimeMS(5000) // 5 second timeout
        .exec(),
      Listing.countDocuments(query).maxTimeMS(3000).exec(),
    ]);

    const result = {
      listings: listings.map(this.transformListing),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    setCachedResult(cacheKey, result);

    return result;
  }

  static async getListingById(id: string): Promise<any | null> {
    const listing = await Listing.findById(id).select('-__v').lean().exec();
    return this.transformListing(listing);
  }

  static async getRecentListings(limit: number = 10): Promise<any[]> {
    const listings = await Listing.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean()
      .exec();
    
    return listings.map(this.transformListing);
  }
}
