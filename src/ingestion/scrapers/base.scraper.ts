import { FirecrawlClient } from '../services/firecrawl.client';
import { ListingSource, RawListing, ScrapeConfig } from '../types';

/**
 * Abstract base class for all listing scrapers
 * Provides common functionality and enforces interface
 */
export abstract class AbstractListingScraper {
  protected firecrawlClient: FirecrawlClient;

  constructor(firecrawlClient: FirecrawlClient) {
    this.firecrawlClient = firecrawlClient;
  }

  /**
   * Get the source this scraper handles
   */
  abstract getSource(): ListingSource;

  /**
   * Get the JSON schema for extracting listing data from this source
   */
  protected abstract getJsonSchema(): any;

  /**
   * Build the search URL for this source
   */
  protected abstract buildSearchUrl(config: ScrapeConfig): string;

  /**
   * Extract listings from Firecrawl response data
   */
  protected abstract extractListings(data: any): any[];

  /**
   * Scrape listings from the source
   */
  async scrape(config: ScrapeConfig): Promise<RawListing[]> {
    const rawListings: RawListing[] = [];
    const source = this.getSource();

    try {
      // Build the search URL
      const url = config.url || this.buildSearchUrl(config);

      // Scrape the page with Firecrawl
      const result = await this.firecrawlClient.scrape({
        url,
        formats: ['extract'],
        jsonOptions: {
          schema: this.getJsonSchema(),
        },
      });

      if (!result.success || !result.data) {
        this.logError(`Scraping failed for ${source}`, result.error);
        return rawListings;
      }

      // Extract listings from the response
      const listings = this.extractListings(result.data);

      // Convert to RawListing format
      for (const listing of listings) {
        if (this.isValidListing(listing)) {
          rawListings.push({
            source,
            sourceUrl: listing.listingUrl || url,
            sourceId: listing.listingId || this.generateSourceId(listing),
            rawData: listing,
            scrapedAt: new Date(),
          });
        }
      }

      this.logInfo(`Scraped ${rawListings.length} listings from ${source}`);
    } catch (error) {
      this.logError(`Error scraping ${source}`, error);
    }

    return rawListings;
  }

  /**
   * Validate that a listing has minimum required data
   */
  protected isValidListing(listing: any): boolean {
    return !!(listing && (listing.listingId || listing.address));
  }

  /**
   * Generate a source ID from listing data if not provided
   */
  protected generateSourceId(listing: any): string {
    // Use address as fallback ID
    const address = listing.address || '';
    const price = listing.price || '';
    return `${address}-${price}`.replace(/\s+/g, '-').toLowerCase();
  }

  /**
   * Log info message
   */
  protected logInfo(message: string): void {
    console.log(`[${this.getSource()}] ${message}`);
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: any): void {
    console.error(`[${this.getSource()}] ${message}`, error || '');
  }
}

/**
 * Interface for listing scrapers
 */
export interface ListingScraper {
  getSource(): ListingSource;
  scrape(config: ScrapeConfig): Promise<RawListing[]>;
}
