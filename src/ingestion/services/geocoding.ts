import { Client } from '@googlemaps/google-maps-services-js';
import { Coordinates } from '../types';
import { config } from '../config';

/**
 * Geocoding service wrapper for Google Maps Geocoding API
 */
export class GeocodingService {
  private client: Client;
  private apiKey: string;
  private cache: Map<string, Coordinates | null>;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.geocoding.apiKey;
    this.client = new Client({});
    this.cache = new Map();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<Coordinates | null> {
    if (!this.apiKey) return null;
    // Check cache first
    if (this.cache.has(address)) {
      return this.cache.get(address) || null;
    }

    let lastError: any;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.geocode({
          params: {
            address,
            key: this.apiKey,
          },
          timeout: 8000,
        });

        if (response.data.results.length === 0) {
          this.cache.set(address, null);
          return null;
        }

        const result = response.data.results[0];
        if (result.partial_match || !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(result.geometry.location_type || '')) return null;
        const location = result.geometry.location;
        const coordinates: Coordinates = {
          latitude: location.lat,
          longitude: location.lng,
        };

        // Validate coordinates
        if (this.isValidCoordinates(coordinates)) {
          this.cache.set(address, coordinates);
          return coordinates;
        }

        this.cache.set(address, null);
        return null;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    console.error(`Geocoding failed for address: ${address}`, lastError);
    this.cache.set(address, null);
    return null;
  }

  /**
   * Validate coordinates are within valid ranges
   */
  private isValidCoordinates(coords: Coordinates): boolean {
    return (
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      coords.longitude >= -180 &&
      coords.longitude <= 180
    );
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
