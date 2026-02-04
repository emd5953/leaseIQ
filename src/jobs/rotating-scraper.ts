import { ListingSource } from '../ingestion/types';

/**
 * High-frequency rotating scraper for competitive apartment alerts
 * PHASE 1: Runs every 15 minutes (conservative start)
 * PHASE 2: Scale to every 10 minutes after 1 week if stable
 * Rotates through source groups to stay within 60-second timeout
 */
export class RotatingScraper {
  // All 13 working sources divided into 13 groups (1 source per run for maximum speed)
  private sourceGroups: ListingSource[][] = [
    [ListingSource.STREETEASY],      // NYC-specific, highest priority
    [ListingSource.RENTHOP],         // NYC-specific
    [ListingSource.ZILLOW],          // High volume
    [ListingSource.APARTMENTS_COM],  // High volume
    [ListingSource.ZUMPER],          // Popular
    [ListingSource.TRULIA],          // Popular
    [ListingSource.REALTOR],         // Major platform
    [ListingSource.HOTPADS],         // Major platform
    [ListingSource.RENT_COM],        // Additional coverage
    [ListingSource.APARTMENT_GUIDE], // Additional coverage
    [ListingSource.RENTALS_COM],     // Additional coverage
    [ListingSource.APARTMENT_LIST],  // Additional coverage
    [ListingSource.PADMAPPER],       // Additional coverage
  ];

  // Configuration for different phases
  private readonly INTERVAL_MINUTES = 10; // You have the credits for 10-minute scraping!

  /**
   * Get sources to scrape based on current interval
   * With 96 runs per day (every 15 min), each source runs 7-8 times daily
   * With 144 runs per day (every 10 min), each source runs 11 times daily
   */
  getCurrentSources(): ListingSource[] {
    const now = new Date();
    const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
    
    // Rotate through groups based on interval
    const intervalsPerDay = 24 * 60 / this.INTERVAL_MINUTES;
    const intervalIndex = Math.floor(minuteOfDay / this.INTERVAL_MINUTES);
    const groupIndex = intervalIndex % this.sourceGroups.length;
    
    const sources = this.sourceGroups[groupIndex];
    console.log(`[RotatingScraper] Interval ${intervalIndex}, Group ${groupIndex + 1}/${this.sourceGroups.length}: Scraping ${sources.length} source(s)`);
    console.log(`[RotatingScraper] Sources:`, sources.join(', '));
    console.log(`[RotatingScraper] Frequency: Every ${this.INTERVAL_MINUTES} minutes`);
    console.log(`[RotatingScraper] Next run: ${this.getNextRunTime()} minutes`);
    
    return sources;
  }

  /**
   * Get all source groups for manual runs
   */
  getAllGroups(): ListingSource[][] {
    return this.sourceGroups;
  }

  /**
   * Get average runs per day per source
   */
  getRunsPerDay(): number {
    const intervalsPerDay = 24 * 60 / this.INTERVAL_MINUTES;
    return Math.floor(intervalsPerDay / this.sourceGroups.length);
  }

  /**
   * Get minutes until next run
   */
  private getNextRunTime(): number {
    const now = new Date();
    const currentMinute = now.getUTCMinutes();
    const nextInterval = Math.ceil((currentMinute + 1) / this.INTERVAL_MINUTES) * this.INTERVAL_MINUTES;
    return nextInterval - currentMinute;
  }

  /**
   * Get maximum freshness (hours between scrapes for same source)
   */
  getMaxFreshness(): number {
    return 24 / this.getRunsPerDay();
  }
}
