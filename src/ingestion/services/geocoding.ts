import { Coordinates } from '../types';
import { config } from '../config';

/**
 * Geocoding service wrapper for Google Maps Geocoding API
 */
export class GeocodingService {
  private apiKey: string;
  private cache: Map<string, Coordinates | null>;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.geocoding.apiKey;
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
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.search = new URLSearchParams({ address, key: this.apiKey }).toString();
        const resultResponse = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resultResponse.ok) throw new Error('Geocoding service unavailable');
        const data = (await resultResponse.json()) as {
          status: string;
          results: Array<{
            partial_match?: boolean;
            geometry: { location_type: string; location: { lat: number; lng: number } };
          }>;
        };
        if (!['OK', 'ZERO_RESULTS'].includes(data.status) || !Array.isArray(data.results))
          throw new Error('Geocoding returned an invalid response');
        const response = { data };
        if (response.data.results.length === 0) {
          this.cache.set(address, null);
          return null;
        }

        if (response.data.results.length !== 1) return null;
        const result = response.data.results[0];
        if (
          result.partial_match ||
          !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(result.geometry.location_type || '')
        )
          return null;
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
