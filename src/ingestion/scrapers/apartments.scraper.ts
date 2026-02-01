import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig, LISTING_EXTRACTION_SCHEMA } from '../types';

/**
 * Scraper for Apartments.com listings
 * Apartments.com is a national apartment rental platform
 */
export class ApartmentsScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.APARTMENTS_COM;
  }

  protected getJsonSchema(): any {
    return LISTING_EXTRACTION_SCHEMA;
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    // Use working Apartments.com search URL
    return 'https://www.apartments.com/new-york-ny/';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
