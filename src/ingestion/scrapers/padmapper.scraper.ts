import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig, LISTING_EXTRACTION_SCHEMA } from '../types';

/**
 * Scraper for PadMapper listings
 */
export class PadMapperScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.PADMAPPER;
  }

  protected getJsonSchema(): any {
    return LISTING_EXTRACTION_SCHEMA;
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    return 'https://www.padmapper.com/apartments/new-york-ny';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) return [];
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
