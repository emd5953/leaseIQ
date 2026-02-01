import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig, LISTING_EXTRACTION_SCHEMA } from '../types';

/**
 * Scraper for Zillow listings
 * Zillow is a national real estate platform
 */
export class ZillowScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.ZILLOW;
  }

  protected getJsonSchema(): any {
    return LISTING_EXTRACTION_SCHEMA;
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    // NYC-focused Zillow rental search
    return 'https://www.zillow.com/new-york-ny/rentals/';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
