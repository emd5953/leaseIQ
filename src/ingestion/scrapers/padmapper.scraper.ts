import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig } from '../types';

/**
 * Scraper for PadMapper listings
 */
export class PadMapperScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.PADMAPPER;
  }

  protected getJsonSchema(): any {
    return {
      type: 'object',
      properties: {
        listings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              listingId: { type: 'string' },
              listingUrl: { type: 'string' },
              address: { type: 'string' },
              price: { type: 'number' },
              bedrooms: { type: 'number' },
              bathrooms: { type: 'number' },
              squareFeet: { type: 'number' },
              description: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
              amenities: { type: 'array', items: { type: 'string' } },
              petPolicy: { type: 'string' },
              brokerFee: { type: 'string' },
            },
          },
        },
      },
    };
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    return 'https://www.padmapper.com/apartments/new-york-ny';
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) return [];
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
