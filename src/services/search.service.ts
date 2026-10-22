import { NYC_CITIES } from '../utils/nyc';
import { Listing } from '../models';
import { presentListing } from '../utils/listing-presentation';
import { buildListingQuery } from '../utils/queries';

export interface SearchFilters {
  q?: string;
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
const CACHE_TTL = 30 * 1000; // 30 seconds - fast updates for new listings

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
    if (oldestKey !== undefined) {
      searchCache.delete(oldestKey);
    }
  }
}

export class SearchService {
  /**
   * Transform listing data for frontend consumption
   * Converts address object to string and flattens nested structures
   */
  private static transformListing(listing: any): any {
    if (!listing) return null;

    return presentListing(listing);
  }

  static async search(filters: SearchFilters, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    console.log('[SEARCH] Starting search with filters:', JSON.stringify(filters));
    
    // Check cache first
    const cacheKey = getCacheKey(filters, options);
    const cached = getCachedResult(cacheKey);
    if (cached) {
      console.log('[SEARCH] Cache hit, returning cached result');
      return cached;
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Cap at 100 for performance
    const skip = (page - 1) * limit;

    // Build query from filters - OPTIMIZED ORDER for index usage
    const query: any = {
      isActive: true, // Start with indexed field
      'address.state': { $in: ['NY', 'New York'] },
      'address.city': { $in: NYC_CITIES }
    };

    // Add other filters from buildListingQuery
    const additionalFilters = buildListingQuery({ ...filters,
      minSquareFootage: filters.minSquareFeet, maxSquareFootage: filters.maxSquareFeet,
      noFeeOnly: filters.noFee, requiredAmenities: filters.amenities,
    });
    if (filters.petsAllowed) additionalFilters.$or = [{ 'petPolicy.allowed': true }, { 'petPolicy.dogsAllowed': true }, { 'petPolicy.catsAllowed': true }];
    if (filters.q?.trim()) {
      const escaped = filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      additionalFilters.$and = [...(additionalFilters.$and || []), { $or: ['address.street', 'address.city', 'address.neighborhood'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } })) }];
    }
    Object.assign(query, additionalFilters);

    console.log('[SEARCH] Query:', JSON.stringify(query));

    // Build sort - handle nested price field
    const baseSortField = options.sortBy || 'createdAt';
    const sortField: string = baseSortField === 'price' ? 'price.amount' : baseSortField;
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder, _id: sortOrder };

    console.log('[SEARCH] Executing MongoDB query...');
    const queryStartTime = Date.now();

    // Execute query with timeout and optimized projection
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('address price bedrooms bathrooms squareFootage squareFeet images sources sourceConflicts petPolicy brokerFee amenities createdAt updatedAt isActive fieldObservedAt dataVersion')
        .lean()
        .maxTimeMS(3000) // Reduced timeout
        .exec(),
      // Use estimatedDocumentCount for faster count on simple queries
      skip === 0 && Object.keys(additionalFilters).length === 0
        ? Listing.countDocuments(query).maxTimeMS(1000).exec()
        : Listing.countDocuments(query).maxTimeMS(2000).exec(),
    ]);

    const queryTime = Date.now() - queryStartTime;
    console.log(`[SEARCH] MongoDB query completed in ${queryTime}ms, found ${listings.length} listings`);

    const result = {
      listings: listings.map(this.transformListing),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    setCachedResult(cacheKey, result);

    const totalTime = Date.now() - startTime;
    console.log(`[SEARCH] Total search time: ${totalTime}ms`);

    return result;
  }

  static async getListingById(id: string): Promise<any | null> {
    const listing = await Listing.findById(id).select('-__v').lean().exec();
    return this.transformListing(listing);
  }

  static async getRecentListings(limit: number = 10): Promise<any[]> {
    const listings = await Listing.find({ isActive: true, 'address.state': { $in: ['NY', 'New York'] }, 'address.city': { $in: NYC_CITIES } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean()
      .exec();
    
    return listings.map(this.transformListing);
  }
}
