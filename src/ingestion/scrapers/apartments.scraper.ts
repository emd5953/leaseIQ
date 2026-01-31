import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig } from '../types';

/**
 * Scraper for Apartments.com listings
 * Apartments.com is a national apartment rental platform
 */
export class ApartmentsScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.APARTMENTS_COM;
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
              images: {
                type: 'array',
                items: { type: 'string' },
              },
              amenities: {
                type: 'array',
                items: { type: 'string' },
              },
              petPolicy: { type: 'string' },
              brokerFee: { type: 'string' },
            },
          },
        },
      },
    };
  }

  protected buildSearchUrl(config: ScrapeConfig): string {
    const baseUrl = 'https://www.apartments.com';
    const location = config.location || 'new-york-ny';
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (config.params?.minPrice) params.append('min-price', config.params.minPrice);
    if (config.params?.maxPrice) params.append('max-price', config.params.maxPrice);
    if (config.params?.bedrooms) params.append('beds', config.params.bedrooms);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}/${location}/?${queryString}` : `${baseUrl}/${location}/`;
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
