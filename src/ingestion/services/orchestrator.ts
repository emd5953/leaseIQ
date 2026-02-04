import { v4 as uuidv4 } from 'uuid';
import { ListingSource, ScrapingJobResult, SourceResult, ScrapeConfig } from '../types';
import { ScrapingJobModel } from '../models';
import { FirecrawlClient } from './firecrawl.client';
import { DataParser } from './parser';
import { DataNormalizer } from './normalizer';
import { GeocodingService } from './geocoding';
import { DeduplicationEngine } from './deduplication';
import { ListingStorage } from './storage';
import { RateLimiter } from './rateLimiter';
import { ErrorHandler } from './errorHandler';
import { MetricsTracker } from './metrics';
import { 
  StreetEasyScraper, 
  ZillowScraper, 
  ApartmentsScraper,
  TruliaScraper,
  RealtorScraper,
  ZumperScraper,
  RentHopScraper,
  RentComScraper,
  HotPadsScraper,
  ApartmentGuideScraper,
  RentalsComScraper,
  ApartmentListScraper,
  PadMapperScraper,
  CraigslistScraper, 
  FacebookScraper 
} from '../scrapers';
import { config } from '../config';

/**
 * Scraping orchestrator that coordinates the entire pipeline
 */
export class ScrapingOrchestrator {
  private firecrawlClient: FirecrawlClient;
  private parser: DataParser;
  private normalizer: DataNormalizer;
  private geocoder: GeocodingService;
  private deduplicator: DeduplicationEngine;
  private storage: ListingStorage;
  private rateLimiter: RateLimiter;
  private errorHandler: ErrorHandler;
  private metricsTracker: MetricsTracker;
  private scrapers: Map<ListingSource, any>;

  constructor() {
    this.firecrawlClient = new FirecrawlClient();
    this.parser = new DataParser();
    this.normalizer = new DataNormalizer();
    this.geocoder = new GeocodingService();
    this.deduplicator = new DeduplicationEngine();
    this.storage = new ListingStorage();
    this.rateLimiter = new RateLimiter();
    this.errorHandler = new ErrorHandler();
    this.metricsTracker = new MetricsTracker();

    // Initialize ALL working scrapers (14 total - Craigslist and Facebook are blocklisted by Firecrawl)
    this.scrapers = new Map();
    this.scrapers.set(ListingSource.STREETEASY, new StreetEasyScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.ZILLOW, new ZillowScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.APARTMENTS_COM, new ApartmentsScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.TRULIA, new TruliaScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.REALTOR, new RealtorScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.ZUMPER, new ZumperScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.RENTHOP, new RentHopScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.RENT_COM, new RentComScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.HOTPADS, new HotPadsScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.APARTMENT_GUIDE, new ApartmentGuideScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.RENTALS_COM, new RentalsComScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.APARTMENT_LIST, new ApartmentListScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.PADMAPPER, new PadMapperScraper(this.firecrawlClient));
    // Craigslist and Facebook are disabled (blocklisted by Firecrawl)

    // Configure rate limiters
    this.rateLimiter.configure('firecrawl', {
      maxRequests: config.firecrawl.rateLimit,
      windowMs: 60000, // per minute
    });
    this.rateLimiter.configure('geocoding', {
      maxRequests: config.geocoding.rateLimit,
      windowMs: 1000, // per second
    });
  }

  /**
   * Run full scrape across all sources
   * For cron jobs with time limits, only scrape high-value sources
   */
  async runFullScrape(): Promise<ScrapingJobResult> {
    // Prioritize high-volume NYC sources to fit within cron timeout
    // Scrape top 5 sources per run to stay under 60 second limit
    const prioritySources = [
      ListingSource.STREETEASY,    // NYC-specific, highest quality
      ListingSource.ZILLOW,         // High volume
      ListingSource.APARTMENTS_COM, // High volume
      ListingSource.RENTHOP,        // NYC-specific
      ListingSource.ZUMPER,         // Good coverage
    ];
    
    console.log(`[Orchestrator] Running optimized scrape for ${prioritySources.length} priority sources`);
    return this.runPartialScrape(prioritySources);
  }

  /**
   * Run scrape for specific sources
   */
  async runPartialScrape(sources: ListingSource[]): Promise<ScrapingJobResult> {
    const jobId = uuidv4();
    const startTime = new Date();

    // Create job record
    await ScrapingJobModel.create({
      jobId,
      status: 'running',
      sources,
      startTime,
    });

    console.log(`[Orchestrator] Starting job ${jobId} for sources: ${sources.join(', ')}`);

    const sourceResults: SourceResult[] = [];
    let totalListingsScraped = 0;
    let newListingsAdded = 0;
    let duplicatesDetected = 0;
    let errorsEncountered = 0;

    // Process sources sequentially (not in parallel) to avoid overwhelming the system
    for (const source of sources) {
      const result = await this.processSingleSource(source);
      if (result) {
        sourceResults.push(result);
        totalListingsScraped += result.listingsScraped;
        newListingsAdded += result.newAdded || 0;
        duplicatesDetected += result.duplicates || 0;
        errorsEncountered += result.errors;
      }
    }

    const endTime = new Date();

    // Update job record
    await ScrapingJobModel.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        endTime,
        totalListingsScraped,
        newListingsAdded,
        duplicatesDetected,
        errorsEncountered,
        sourceResults,
      }
    );

    const result: ScrapingJobResult = {
      jobId,
      startTime,
      endTime,
      totalListingsScraped,
      newListingsAdded,
      duplicatesDetected,
      errorsEncountered,
      sourceResults,
    };

    // Record metrics
    await this.metricsTracker.recordJobResult(result);

    console.log(`[Orchestrator] Job ${jobId} completed:`, {
      totalListingsScraped,
      newListingsAdded,
      duplicatesDetected,
      errorsEncountered,
    });

    return result;
  }

  /**
   * Process a single source with parallel listing processing
   */
  private async processSingleSource(source: ListingSource): Promise<SourceResult & { newAdded?: number; duplicates?: number }> {
    const sourceStart = Date.now();
    let sourceListings = 0;
    let sourceErrors = 0;
    let newAdded = 0;
    let duplicates = 0;

    try {
      await this.rateLimiter.acquire('firecrawl');

      const scraper = this.scrapers.get(source);
      if (!scraper) {
        console.error(`[Orchestrator] No scraper found for source: ${source}`);
        return {
          source,
          listingsScraped: 0,
          errors: 1,
          duration: Date.now() - sourceStart,
        };
      }

      // Get NYC-specific URLs for this source
      const urls = this.getNYCUrlsForSource(source);
      
      // Scrape all URLs for this source
      const allRawListings = [];
      for (const url of urls) {
        const rawListings = await scraper.scrape({ url } as ScrapeConfig);
        allRawListings.push(...rawListings);
      }
      
      sourceListings = allRawListings.length;

      // Process listings in parallel batches (3 at a time for faster completion within timeout)
      const BATCH_SIZE = 3;
      for (let i = 0; i < allRawListings.length; i += BATCH_SIZE) {
        const batch = allRawListings.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(rawListing => this.processListing(rawListing, source))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value === 'new') newAdded++;
            else if (result.value === 'duplicate') duplicates++;
          } else {
            sourceErrors++;
          }
        }
      }
    } catch (error) {
      sourceErrors++;
      await this.errorHandler.handleError(error as Error, {
        operation: 'scrape_source',
        source,
      });
    }

    const sourceDuration = Date.now() - sourceStart;
    return {
      source,
      listingsScraped: sourceListings,
      errors: sourceErrors,
      duration: sourceDuration,
      newAdded,
      duplicates,
    };
  }

  /**
   * Get NYC-specific URLs for each source to maximize listings
   * Optimized for cron timeout - only 1 URL per source
   */
  private getNYCUrlsForSource(source: ListingSource): string[] {
    const urls: Record<ListingSource, string[]> = {
      [ListingSource.STREETEASY]: [
        'https://streeteasy.com/for-rent/nyc',
      ],
      [ListingSource.ZILLOW]: [
        'https://www.zillow.com/new-york-ny/rentals/',
      ],
      [ListingSource.APARTMENTS_COM]: [
        'https://www.apartments.com/new-york-ny/',
      ],
      [ListingSource.TRULIA]: [
        'https://www.trulia.com/for_rent/New_York,NY/',
      ],
      [ListingSource.REALTOR]: [
        'https://www.realtor.com/apartments/New-York_NY',
      ],
      [ListingSource.ZUMPER]: [
        'https://www.zumper.com/apartments-for-rent/new-york-ny',
      ],
      [ListingSource.RENTHOP]: [
        'https://www.renthop.com/search/nyc',
      ],
      [ListingSource.RENT_COM]: [
        'https://www.rent.com/new-york/apartments',
      ],
      [ListingSource.HOTPADS]: [
        'https://hotpads.com/new-york-ny/apartments-for-rent',
      ],
      [ListingSource.APARTMENT_GUIDE]: [
        'https://www.apartmentguide.com/apartments/New-York/New-York/',
      ],
      [ListingSource.RENTALS_COM]: [
        'https://www.rentals.com/New-York/New-York/',
      ],
      [ListingSource.APARTMENT_LIST]: [
        'https://www.apartmentlist.com/ny/new-york',
      ],
      [ListingSource.PADMAPPER]: [
        'https://www.padmapper.com/apartments/new-york-ny',
      ],
      [ListingSource.CRAIGSLIST]: [],
      [ListingSource.FACEBOOK]: [],
    };

    return urls[source] || [];
  }

  /**
   * Process a single listing
   */
  private async processListing(rawListing: any, source: ListingSource): Promise<'new' | 'duplicate' | 'error'> {
    try {
      // Parse
      const parsed = await this.parser.parse(rawListing);
      if (!parsed) {
        return 'error';
      }

      // Normalize
      const normalized = await this.normalizer.normalize(parsed);

      // Check for duplicates BEFORE geocoding (saves API calls)
      const duplicateId = await this.deduplicator.findDuplicate(normalized);
      if (duplicateId) {
        await this.deduplicator.mergeListing(duplicateId, normalized);
        return 'duplicate';
      }

      // Only geocode if it's a new listing
      await this.rateLimiter.acquire('geocoding');
      const coordinates = await this.geocoder.geocode(normalized.address.fullAddress);

      // Validate NYC location - reject listings outside NYC
      if (!this.isNYCListing(normalized.address, coordinates)) {
        console.log(`[Orchestrator] Rejected non-NYC listing: ${normalized.address.fullAddress}`);
        return 'error';
      }

      // Store new listing
      await this.storage.insertListing(normalized, coordinates);
      return 'new';
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        operation: 'process_listing',
        source,
      });
      return 'error';
    }
  }

  /**
   * Validate if a listing is within NYC boundaries
   * Uses both address validation and coordinate boundaries
   */
  private isNYCListing(address: any, coordinates: any): boolean {
    // NYC coordinate boundaries (approximate)
    const NYC_BOUNDS = {
      minLat: 40.4774,  // Southern tip of Staten Island
      maxLat: 40.9176,  // Northern Bronx
      minLng: -74.2591, // Western Staten Island
      maxLng: -73.7004, // Eastern Queens
    };

    // Valid NYC states
    const validStates = ['NY', 'New York'];
    
    // Valid NYC cities/boroughs
    const validCities = [
      'New York',
      'Manhattan',
      'Brooklyn',
      'Queens',
      'Bronx',
      'Staten Island',
      'New York City',
      'NYC',
    ];

    // NYC zip code ranges (more reliable than city names)
    const nycZipRanges = [
      { min: 10001, max: 10282 }, // Manhattan
      { min: 10301, max: 10314 }, // Staten Island
      { min: 10451, max: 10475 }, // Bronx
      { min: 11004, max: 11109 }, // Queens
      { min: 11201, max: 11256 }, // Brooklyn
      { min: 11351, max: 11697 }, // Queens (extended)
    ];

    // Check state - must be NY
    if (address.state && !validStates.includes(address.state)) {
      return false;
    }

    // Check zip code first (most reliable for NYC)
    if (address.zipCode) {
      const zip = parseInt(address.zipCode.toString().substring(0, 5));
      const isNYCZip = nycZipRanges.some(range => zip >= range.min && zip <= range.max);
      if (isNYCZip) {
        // If zip is NYC, validate with coordinates if available
        if (coordinates && coordinates.latitude && coordinates.longitude) {
          const { latitude, longitude } = coordinates;
          if (
            latitude >= NYC_BOUNDS.minLat &&
            latitude <= NYC_BOUNDS.maxLat &&
            longitude >= NYC_BOUNDS.minLng &&
            longitude <= NYC_BOUNDS.maxLng
          ) {
            return true;
          }
        } else {
          // No coordinates, trust the zip code
          return true;
        }
      }
    }

    // Fallback: Check city name (case-insensitive)
    if (address.city) {
      const cityLower = address.city.toLowerCase();
      const isValidCity = validCities.some(c => cityLower.includes(c.toLowerCase()));
      if (isValidCity) {
        // Validate with coordinates if available
        if (coordinates && coordinates.latitude && coordinates.longitude) {
          const { latitude, longitude } = coordinates;
          if (
            latitude >= NYC_BOUNDS.minLat &&
            latitude <= NYC_BOUNDS.maxLat &&
            longitude >= NYC_BOUNDS.minLng &&
            longitude <= NYC_BOUNDS.maxLng
          ) {
            return true;
          }
        } else {
          // No coordinates, trust the city name
          return true;
        }
      }
    }

    // If we have coordinates but no valid city/zip, check coordinates alone
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const { latitude, longitude } = coordinates;
      if (
        latitude >= NYC_BOUNDS.minLat &&
        latitude <= NYC_BOUNDS.maxLat &&
        longitude >= NYC_BOUNDS.minLng &&
        longitude <= NYC_BOUNDS.maxLng
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    return await ScrapingJobModel.findOne({ jobId });
  }
}
