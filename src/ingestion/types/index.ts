/**
 * Core type definitions for the listing ingestion pipeline
 */

export enum ListingSource {
  STREETEASY = 'streeteasy',
  ZILLOW = 'zillow',
  APARTMENTS_COM = 'apartments_com',
  TRULIA = 'trulia',
  REALTOR = 'realtor',
  ZUMPER = 'zumper',
  RENTHOP = 'renthop',
  RENT_COM = 'rent_com',
  HOTPADS = 'hotpads',
  APARTMENT_GUIDE = 'apartment_guide',
  RENTALS_COM = 'rentals_com',
  APARTMENT_LIST = 'apartment_list',
  PADMAPPER = 'padmapper',
  CRAIGSLIST = 'craigslist',
  FACEBOOK = 'facebook',
}

export interface RawListing {
  source: ListingSource;
  sourceUrl: string;
  sourceId: string;
  rawData: any;
  scrapedAt: Date;
}

export interface ParsedListing {
  source: ListingSource;
  sourceUrl: string;
  sourceId: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  description: string | null;
  images: string[];
  floorPlanImages: string[];
  amenities: string[];
  petPolicy: string | null;
  brokerFee: string | null;
  // Additional details
  buildingType: string | null;
  yearBuilt: number | null;
  totalUnits: number | null;
  parking: string | null;
  leaseLength: string | null;
  securityDeposit: number | null;
  applicationFee: number | null;
  availableDate: string | null;
  utilities: {
    electric: boolean;
    gas: boolean;
    water: boolean;
    internet: boolean;
    trash: boolean;
  } | null;
  laundry: string | null;
  heating: string | null;
  cooling: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  scrapedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

export interface Price {
  amount: number;
  currency: string;
  period: 'monthly' | 'weekly' | 'daily';
}

export interface PetPolicy {
  allowed: boolean;
  restrictions: string | null;
  deposit: number | null;
}

export interface BrokerFee {
  required: boolean;
  amount: number | null;
  percentage: number | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NormalizedListing {
  source: ListingSource;
  sourceUrl: string;
  sourceId: string;
  address: Address;
  price: Price;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  description: string | null;
  images: string[];
  floorPlanImages: string[];
  amenities: string[];
  petPolicy: PetPolicy | null;
  brokerFee: BrokerFee | null;
  // Additional details
  buildingType: string | null;
  yearBuilt: number | null;
  totalUnits: number | null;
  parking: string | null;
  leaseLength: string | null;
  securityDeposit: number | null;
  applicationFee: number | null;
  availableDate: Date | null;
  utilities: {
    electric: boolean;
    gas: boolean;
    water: boolean;
    internet: boolean;
    trash: boolean;
  };
  laundry: string | null;
  heating: string | null;
  cooling: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  scrapedAt: Date;
}

export interface SourceReference {
  source: ListingSource;
  sourceUrl: string;
  sourceId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface StoredListing extends NormalizedListing {
  _id: string;
  coordinates: Coordinates | null;
  sources: SourceReference[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ScrapeConfig {
  url: string;
  maxListings?: number;
  location?: string;
  params?: Record<string, any>;
}

export interface SourceResult {
  source: ListingSource;
  listingsScraped: number;
  errors: number;
  duration: number;
}

export interface ScrapingJobResult {
  jobId: string;
  startTime: Date;
  endTime: Date;
  totalListingsScraped: number;
  newListingsAdded: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  sourceResults: SourceResult[];
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ErrorContext {
  operation: string;
  source?: ListingSource;
  listingId?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface Metrics {
  totalJobs: number;
  totalListingsScraped: number;
  totalNewListings: number;
  totalDuplicates: number;
  totalErrors: number;
  averageJobDuration: number;
  sourceBreakdown: SourceMetrics[];
}

export interface SourceMetrics {
  source: ListingSource;
  listingsScraped: number;
  successRate: number;
  averageDuration: number;
}

/**
 * Enhanced JSON schema for Firecrawl extraction
 * Used by all scrapers to extract comprehensive listing data
 */
export const LISTING_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    listings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          listingUrl: { type: 'string' },
          address: { type: 'string' },
          price: { type: 'number' },
          bedrooms: { type: 'number' },
          bathrooms: { type: 'number' },
          squareFeet: { type: 'number' },
          description: { type: 'string' },
          images: {
            type: 'array',
            items: { type: 'string' },
          },
          floorPlanImages: {
            type: 'array',
            items: { type: 'string' },
            description: 'URLs to floor plan images',
          },
          amenities: {
            type: 'array',
            items: { type: 'string' },
          },
          petPolicy: { type: 'string' },
          brokerFee: { type: 'string' },
          // Building details
          buildingType: { type: 'string', description: 'e.g., Apartment, Condo, Townhouse' },
          yearBuilt: { type: 'number' },
          totalUnits: { type: 'number' },
          parking: { type: 'string', description: 'Parking availability info' },
          // Lease terms
          leaseLength: { type: 'string', description: 'e.g., 12 months, flexible' },
          securityDeposit: { type: 'number' },
          applicationFee: { type: 'number' },
          availableDate: { type: 'string' },
          // Utilities
          utilities: {
            type: 'object',
            properties: {
              electric: { type: 'boolean', description: 'true if included in rent' },
              gas: { type: 'boolean' },
              water: { type: 'boolean' },
              internet: { type: 'boolean' },
              trash: { type: 'boolean' },
            },
          },
          // Unit features
          laundry: { type: 'string', description: 'In-unit, In-building, None' },
          heating: { type: 'string' },
          cooling: { type: 'string' },
          // Contact
          contactPhone: { type: 'string' },
          contactEmail: { type: 'string' },
        },
      },
    },
  },
};

// Document interfaces for MongoDB storage
export interface IScrapingJob {
  jobId: string;
  status: JobStatus;
  sources: ListingSource[];
  startTime?: Date;
  endTime?: Date;
  totalListingsScraped: number;
  newListingsAdded: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  sourceResults: SourceResult[];
  createdAt: Date;
}

export interface IMetrics {
  jobId: string;
  timestamp: Date;
  totalListingsScraped: number;
  newListingsAdded: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  duration: number;
  sourceBreakdown: SourceResult[];
}
