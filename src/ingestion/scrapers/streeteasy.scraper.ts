import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig, LISTING_EXTRACTION_SCHEMA } from '../types';

/**
 * Scraper for StreetEasy listings
 * StreetEasy is a NYC-focused real estate platform
 */
export class StreetEasyScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.STREETEASY;
  }

  protected getJsonSchema(): any {
    return LISTING_EXTRACTION_SCHEMA;
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    // Use working StreetEasy rental search URL
    return 'https://streeteasy.com/for-rent/nyc';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
