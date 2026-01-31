import { AbstractListingScraper } from './base.scraper';
import { ListingSource, ScrapeConfig } from '../types';

/**
 * Scraper for Zillow listings
 * Zillow is a national real estate platform
 */
export class ZillowScraper extends AbstractListingScraper {
  getSource(): ListingSource {
    return ListingSource.ZILLOW;
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
    const baseUrl = 'https://www.zillow.com';
    const location = config.location || 'new-york-ny';
    
    // Build URL with query parameters
    const params = new URLSearchParams();
    params.append('searchQueryState', JSON.stringify({
      pagination: {},
      usersSearchTerm: location,
      mapBounds: {},
      isMapVisible: false,
      filterState: {
        isForSaleByAgent: { value: false },
        isForSaleByOwner: { value: false },
        isNewConstruction: { value: false },
        isForSaleForeclosure: { value: false },
        isComingSoon: { value: false },
        isAuction: { value: false },
        isPreMarketForeclosure: { value: false },
        isPreMarketPreForeclosure: { value: false },
        isForRent: { value: true },
      },
    }));
    
    return `${baseUrl}/${location}/rentals/?${params.toString()}`;
  }

  protected extractListings(data: any): any[] {
    if (!data || !data.listings) {
      return [];
    }
    return Array.isArray(data.listings) ? data.listings : [];
  }
}
