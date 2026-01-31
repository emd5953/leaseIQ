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
  amenities: string[];
  petPolicy: string | null;
  brokerFee: string | null;
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
  amenities: string[];
  petPolicy: PetPolicy | null;
  brokerFee: BrokerFee | null;
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
