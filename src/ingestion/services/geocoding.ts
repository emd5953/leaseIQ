import { Client } from '@googlemaps/google-maps-services-js';
import { Coordinates } from '../types';
import { config } from '../config';

/**
 * Geocoding service wrapper for Google Maps Geocoding API
 */
export class GeocodingService {
  private client: Client;
  private cache: Map<string, Coordinates | null>;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey?: string) {
    this.client = new Client({});
    this.cache = new Map();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<Coordinates | null> {
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
            key: config.geocoding.apiKey,
          },
        });

        if (response.data.results.length === 0) {
          this.cache.set(address, null);
          return null;
        }

        const location = response.data.results[0].geometry.location;
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
