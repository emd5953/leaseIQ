import { isNYCAddress } from '../../utils/nyc';
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

    // LeaseIQ currently focuses on StreetEasy as its sole listing source.
    // Keep the source abstraction in place so expanding later does not require
    // changing the ingestion pipeline or stored listing shape.
    this.scrapers = new Map();
    this.scrapers.set(ListingSource.STREETEASY, new StreetEasyScraper(this.firecrawlClient));

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
   * Run the configured full scrape.
   * The current product scope is StreetEasy only.
   */
  async runFullScrape(): Promise<ScrapingJobResult> {
    console.log('[Orchestrator] Running StreetEasy-only scrape');
    return this.runPartialScrape([ListingSource.STREETEASY]);
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
      try {
        // HTTP clients own their deadlines. Racing this work against a timer lets
        // timed-out imports continue writing after the job has been marked done.
        const result = await this.processSingleSource(source);
        
        if (result) {
          sourceResults.push(result);
          totalListingsScraped += result.listingsScraped;
          newListingsAdded += result.newAdded || 0;
          duplicatesDetected += result.duplicates || 0;
          errorsEncountered += result.errors;
        }
      } catch (error) {
        console.error(`[Orchestrator] Failed to process source ${source}:`, error);
        errorsEncountered++;
        sourceResults.push({
          source,
          listingsScraped: 0,
          errors: 1,
          duration: 50000,
        });
      }
    }

    const endTime = new Date();

    // Update job record
    await ScrapingJobModel.findOneAndUpdate(
      { jobId },
      {
        status: errorsEncountered > 0 ? 'failed' : 'completed',
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
    const issues: string[] = [];
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
      
      // Scrape all URLs for this source with timeout protection
      const allRawListings = [];
      for (const url of urls) {
        console.log(`[Orchestrator] Scraping ${source} from ${url}...`);
        const scrapeStart = Date.now();
        
        try {
          const rawListings = await scraper.scrape({ url } as ScrapeConfig);
          const scrapeDuration = Date.now() - scrapeStart;
          console.log(`[Orchestrator] Scraped ${rawListings.length} listings from ${source} in ${scrapeDuration}ms`);
          allRawListings.push(...rawListings);
        } catch (scrapeError) {
          const scrapeDuration = Date.now() - scrapeStart;
          console.error(`[Orchestrator] Scrape failed for ${source} after ${scrapeDuration}ms:`, scrapeError);
          sourceErrors++;
          issues.push(scrapeError instanceof Error ? scrapeError.message : 'Source scrape failed');
          // Continue to next URL instead of failing entire source
        }
      }
      
      sourceListings = allRawListings.length;

      if (allRawListings.length === 0) {
        console.log(`[Orchestrator] No listings found for ${source}, skipping processing`);
        return {
          source,
          listingsScraped: 0,
          errors: sourceErrors || 1,
          issues: issues.length ? issues.slice(0, 20) : ['Source returned no usable listings; coverage was not refreshed.'],
          duration: Date.now() - sourceStart,
          newAdded: 0,
          duplicates: 0,
        };
      }

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
            else { sourceErrors++; issues.push('Listing was rejected during processing'); }
          } else {
            sourceErrors++;
            issues.push(result.reason instanceof Error ? result.reason.message : 'Listing import failed');
          }
        }
      }
    } catch (error) {
      sourceErrors++;
      issues.push(error instanceof Error ? error.message : 'Source failed');
      await this.errorHandler.handleError(error as Error, {
        operation: 'scrape_source',
        source,
      });
    }

    const sourceDuration = Date.now() - sourceStart;
    console.log(`[Orchestrator] Completed ${source}: ${newAdded} new, ${duplicates} duplicates, ${sourceErrors} errors in ${sourceDuration}ms`);
    return {
      source,
      listingsScraped: sourceListings,
      errors: sourceErrors,
      issues: issues.slice(0, 20),
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
        throw new Error('Listing could not be parsed');
      }

      // Normalize
      const normalized = await this.normalizer.normalize(parsed);

      if (!this.isNYCListing(normalized.address, null)) throw new Error('Address is outside supported NYC coverage');

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
        throw new Error('Listing coordinates are outside supported NYC coverage');
      }

      // Store new listing
      await this.storage.insertListing(normalized, coordinates);
      return 'new';
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        operation: 'process_listing',
        source,
      });
      throw error;
    }
  }

  /**
   * Validate if a listing is within NYC boundaries
   * Uses both address validation and coordinate boundaries
   */
  private isNYCListing(address: any, coordinates: any): boolean {
    return isNYCAddress(address, coordinates);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    return await ScrapingJobModel.findOne({ jobId });
  }
}
