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

    // Initialize scrapers
    this.scrapers = new Map();
    this.scrapers.set(ListingSource.STREETEASY, new StreetEasyScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.ZILLOW, new ZillowScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.APARTMENTS_COM, new ApartmentsScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.CRAIGSLIST, new CraigslistScraper(this.firecrawlClient));
    this.scrapers.set(ListingSource.FACEBOOK, new FacebookScraper(this.firecrawlClient));

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
   */
  async runFullScrape(): Promise<ScrapingJobResult> {
    const sources = Object.values(ListingSource);
    return this.runPartialScrape(sources);
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

    // Process each source
    for (const source of sources) {
      const sourceStart = Date.now();
      let sourceListings = 0;
      let sourceErrors = 0;

      try {
        await this.rateLimiter.acquire('firecrawl');

        const scraper = this.scrapers.get(source);
        if (!scraper) {
          console.error(`[Orchestrator] No scraper found for source: ${source}`);
          continue;
        }

        // Scrape listings
        const rawListings = await scraper.scrape({} as ScrapeConfig);
        sourceListings = rawListings.length;

        // Process each listing
        for (const rawListing of rawListings) {
          try {
            // Parse
            const parsed = await this.parser.parse(rawListing);
            if (!parsed) {
              sourceErrors++;
              continue;
            }

            // Normalize
            const normalized = await this.normalizer.normalize(parsed);

            // Geocode
            await this.rateLimiter.acquire('geocoding');
            const coordinates = await this.geocoder.geocode(normalized.address.fullAddress);

            // Deduplicate
            const duplicateId = await this.deduplicator.findDuplicate(normalized);
            if (duplicateId) {
              await this.deduplicator.mergeListing(duplicateId, normalized);
              duplicatesDetected++;
            } else {
              await this.storage.insertListing(normalized, coordinates);
              newListingsAdded++;
            }
          } catch (error) {
            sourceErrors++;
            await this.errorHandler.handleError(error as Error, {
              operation: 'process_listing',
              source,
            });
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
      sourceResults.push({
        source,
        listingsScraped: sourceListings,
        errors: sourceErrors,
        duration: sourceDuration,
      });

      totalListingsScraped += sourceListings;
      errorsEncountered += sourceErrors;
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
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    return await ScrapingJobModel.findOne({ jobId });
  }
}
