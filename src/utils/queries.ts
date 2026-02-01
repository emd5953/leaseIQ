import { FilterQuery, Types } from 'mongoose';
import { IListing } from '../models/listing.model';
import { IUserPreferences } from '../models/userPreferences.model';
import { ISavedSearch } from '../models/savedSearch.model';

/**
 * Search criteria type that can come from UserPreferences or SavedSearch
 */
export type SearchCriteria = Partial<IUserPreferences['_id']> & {
  minPrice?: number | null;
  maxPrice?: number | null;
  minBedrooms?: number | null;
  maxBedrooms?: number | null;
  minBathrooms?: number | null;
  maxBathrooms?: number | null;
  minSquareFootage?: number | null;
  maxSquareFootage?: number | null;
  neighborhoods?: string[];
  earliestMoveIn?: Date | null;
  latestMoveIn?: Date | null;
  commuteDestination?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  } | null;
  maxCommuteMinutes?: number | null;
  requiredAmenities?: string[];
  requiresDogsAllowed?: boolean;
  requiresCatsAllowed?: boolean;
  noFeeOnly?: boolean;
  maxListingAgeDays?: number | null;
};

/**
 * Pagination options for listing queries
 */
export interface PaginationOptions {
  page: number;      // Page number (1-indexed)
  pageSize: number;  // Number of results per page
}

/**
 * Paginated query result
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Convert user preferences or saved search criteria to MongoDB query filter
 * 
 * @param criteria - Search criteria from UserPreferences or SavedSearch
 * @returns MongoDB filter query object
 */
export function buildListingQuery(criteria: SearchCriteria): FilterQuery<IListing> {
  const query: any = {};

  // Price range filter
  if (criteria.minPrice !== null && criteria.minPrice !== undefined) {
    if (!query['price.amount']) query['price.amount'] = {};
    query['price.amount'].$gte = criteria.minPrice;
  }
  if (criteria.maxPrice !== null && criteria.maxPrice !== undefined) {
    if (!query['price.amount']) query['price.amount'] = {};
    query['price.amount'].$lte = criteria.maxPrice;
  }

  // Bedroom range filter
  if (criteria.minBedrooms !== null && criteria.minBedrooms !== undefined) {
    query.bedrooms = { ...query.bedrooms, $gte: criteria.minBedrooms };
  }
  if (criteria.maxBedrooms !== null && criteria.maxBedrooms !== undefined) {
    query.bedrooms = { ...query.bedrooms, $lte: criteria.maxBedrooms };
  }

  // Bathroom range filter
  if (criteria.minBathrooms !== null && criteria.minBathrooms !== undefined) {
    query.bathrooms = { ...query.bathrooms, $gte: criteria.minBathrooms };
  }
  if (criteria.maxBathrooms !== null && criteria.maxBathrooms !== undefined) {
    query.bathrooms = { ...query.bathrooms, $lte: criteria.maxBathrooms };
  }

  // Square footage range filter
  if (criteria.minSquareFootage !== null && criteria.minSquareFootage !== undefined) {
    query.squareFootage = { ...query.squareFootage, $gte: criteria.minSquareFootage };
  }
  if (criteria.maxSquareFootage !== null && criteria.maxSquareFootage !== undefined) {
    query.squareFootage = { ...query.squareFootage, $lte: criteria.maxSquareFootage };
  }

  // Neighborhoods filter
  if (criteria.neighborhoods && criteria.neighborhoods.length > 0) {
    // Search in both city and street fields to match neighborhoods
    const neighborhoodQuery = {
      $or: [
        { 'address.city': { $in: criteria.neighborhoods } },
        { 'address.street': { $regex: criteria.neighborhoods.join('|'), $options: 'i' } }
      ]
    };
    
    // If query already has $or, combine them with $and
    if (query.$or) {
      query.$and = [{ $or: query.$or }, neighborhoodQuery];
      delete query.$or;
    } else {
      Object.assign(query, neighborhoodQuery);
    }
  }

  // Move-in date range filter
  if (criteria.earliestMoveIn !== null && criteria.earliestMoveIn !== undefined) {
    query.availableDate = { ...query.availableDate, $gte: criteria.earliestMoveIn };
  }
  if (criteria.latestMoveIn !== null && criteria.latestMoveIn !== undefined) {
    query.availableDate = { ...query.availableDate, $lte: criteria.latestMoveIn };
  }

  // Pet requirements filter
  if (criteria.requiresDogsAllowed === true) {
    query['petPolicy.dogsAllowed'] = true;
  }
  if (criteria.requiresCatsAllowed === true) {
    query['petPolicy.catsAllowed'] = true;
  }

  // No fee filter
  if (criteria.noFeeOnly === true) {
    query['brokerFee.required'] = false;
  }

  // Required amenities filter (listing must have ALL required amenities)
  if (criteria.requiredAmenities && criteria.requiredAmenities.length > 0) {
    query.amenities = { $all: criteria.requiredAmenities };
  }

  // Listing age filter
  if (criteria.maxListingAgeDays !== null && criteria.maxListingAgeDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.maxListingAgeDays);
    query.createdAt = { ...query.createdAt, $gte: cutoffDate };
  }

  return query;
}

/**
 * Build query for listings created or updated after a specific timestamp
 * 
 * @param timestamp - The cutoff timestamp
 * @returns MongoDB filter query object
 */
export function buildTimestampQuery(timestamp: Date): FilterQuery<IListing> {
  return {
    $or: [
      { createdAt: { $gt: timestamp } },
      { updatedAt: { $gt: timestamp } }
    ]
  };
}

/**
 * Build query to exclude hidden listings for a specific user
 * 
 * @param userId - The user's ObjectId
 * @param hiddenListingIds - Array of listing IDs that the user has hidden
 * @returns MongoDB filter query object
 */
export function buildHiddenListingExclusionQuery(
  hiddenListingIds: Types.ObjectId[]
): FilterQuery<IListing> {
  if (hiddenListingIds.length === 0) {
    return {};
  }
  
  return {
    _id: { $nin: hiddenListingIds }
  };
}

/**
 * Apply pagination to a query
 * 
 * @param query - Mongoose query object
 * @param options - Pagination options
 * @returns Object with skip and limit values
 */
export function applyPagination(options: PaginationOptions): { skip: number; limit: number } {
  const page = Math.max(1, options.page); // Ensure page is at least 1
  const pageSize = Math.max(1, options.pageSize); // Ensure pageSize is at least 1
  
  const skip = (page - 1) * pageSize;
  const limit = pageSize;
  
  return { skip, limit };
}

/**
 * Create a paginated result object
 * 
 * @param data - Array of results for the current page
 * @param totalCount - Total number of results across all pages
 * @param options - Pagination options used for the query
 * @returns Paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  totalCount: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / options.pageSize);
  
  return {
    data,
    page: options.page,
    pageSize: options.pageSize,
    totalCount,
    totalPages
  };
}

/**
 * Combine multiple query filters using AND logic
 * 
 * @param filters - Array of filter query objects
 * @returns Combined MongoDB filter query object
 */
export function combineQueryFilters(...filters: FilterQuery<IListing>[]): FilterQuery<IListing> {
  const nonEmptyFilters = filters.filter(f => Object.keys(f).length > 0);
  
  if (nonEmptyFilters.length === 0) {
    return {};
  }
  
  if (nonEmptyFilters.length === 1) {
    return nonEmptyFilters[0];
  }
  
  return { $and: nonEmptyFilters };
}
