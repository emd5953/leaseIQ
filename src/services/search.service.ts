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

export class SearchService {
  static async search(filters: SearchFilters, options: SearchOptions = {}): Promise<SearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Build query from filters
    const query = buildListingQuery(filters);

    // Build sort
    const sortField = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Execute query
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean()
        .exec(),
      Listing.countDocuments(query).exec(),
    ]);

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getListingById(id: string): Promise<any | null> {
    return Listing.findById(id).select('-__v').lean().exec();
  }

  static async getRecentListings(limit: number = 10): Promise<any[]> {
    return Listing.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean()
      .exec();
  }
}
