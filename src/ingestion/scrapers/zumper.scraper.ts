import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig, LISTING_EXTRACTION_SCHEMA } from '../types';

/**
 * Scraper for Zumper listings
 * Zumper is a national apartment rental platform
 */
export class ZumperScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.ZUMPER;
  }

  protected getJsonSchema(): any {
    return LISTING_EXTRACTION_SCHEMA;
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    return 'https://www.zumper.com/apartments-for-rent/new-york-ny';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
