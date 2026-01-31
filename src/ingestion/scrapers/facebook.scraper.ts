import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig } from '../types';

/**
 * Scraper for Facebook Marketplace listings
 * Facebook Marketplace is a social marketplace with rental listings
 */
export class FacebookScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.FACEBOOK;
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
    const baseUrl = 'https://www.facebook.com/marketplace';
    const location = config.location || 'newyork';
    const category = 'propertyrentals';
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (config.params?.minPrice) params.append('minPrice', config.params.minPrice);
    if (config.params?.maxPrice) params.append('maxPrice', config.params.maxPrice);
    if (config.params?.bedrooms) params.append('bedrooms', config.params.bedrooms);
    
    const queryString = params.toString();
    return queryString 
      ? `${baseUrl}/${location}/${category}?${queryString}` 
      : `${baseUrl}/${location}/${category}`;
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
