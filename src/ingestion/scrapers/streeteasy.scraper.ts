import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig } from '../types';

/**
 * Scraper for StreetEasy listings
 * StreetEasy is a NYC-focused real estate platform
 */
export class StreetEasyScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.STREETEASY;
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
    const baseUrl = 'https://streeteasy.com/for-rent';
    const location = config.location || 'nyc';
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (config.params?.minPrice) params.append('price_min', config.params.minPrice);
    if (config.params?.maxPrice) params.append('price_max', config.params.maxPrice);
    if (config.params?.bedrooms) params.append('beds', config.params.bedrooms);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}/${location}?${queryString}` : `${baseUrl}/${location}`;
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
