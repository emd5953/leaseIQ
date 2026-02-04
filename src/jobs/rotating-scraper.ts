import { ListingSource } from '../ingestion/types';

/**
 * Rotating scraper strategy to handle timeout constraints
 * Cycles through different source groups every 2 hours (12 runs per day)
 * This ensures all sources are scraped 4 times per day
 */
export class RotatingScraper {
  // All 13 working sources divided into 3 groups
  private sourceGroups: ListingSource[][] = [
    // Group 1: High-priority NYC sources
    [
      ListingSource.STREETEASY,
      ListingSource.RENTHOP,
      ListingSource.ZILLOW,
      ListingSource.APARTMENTS_COM,
    ],
    // Group 2: Major platforms
    [
      ListingSource.ZUMPER,
      ListingSource.TRULIA,
      ListingSource.REALTOR,
      ListingSource.HOTPADS,
    ],
    // Group 3: Additional sources
    [
      ListingSource.RENT_COM,
      ListingSource.APARTMENT_GUIDE,
      ListingSource.RENTALS_COM,
      ListingSource.APARTMENT_LIST,
      ListingSource.PADMAPPER,
    ],
  ];

  /**
   * Get sources to scrape based on current hour
   * Rotates through 3 groups every 2 hours
   * With 12 runs per day (every 2 hours), each group runs 4 times daily
   */
  getCurrentSources(): ListingSource[] {
    const now = new Date();
    const hourOfDay = now.getUTCHours();
    
    // Rotate every 2 hours: 0-1, 2-3, 4-5, etc.
    // Pattern: Group 1, Group 2, Group 3, Group 1, Group 2, Group 3...
    const groupIndex = Math.floor(hourOfDay / 2) % this.sourceGroups.length;
    
    const sources = this.sourceGroups[groupIndex];
    console.log(`[RotatingScraper] Hour ${hourOfDay}, Group ${groupIndex + 1}: Scraping ${sources.length} sources`);
    console.log(`[RotatingScraper] Sources:`, sources.join(', '));
    
    return sources;
  }

  /**
   * Get all source groups for manual runs
   */
  getAllGroups(): ListingSource[][] {
    return this.sourceGroups;
  }

  /**
   * Get total number of runs per day per group
   */
  getRunsPerDay(): number {
    return 24 / 2 / this.sourceGroups.length; // 24 hours / 2-hour intervals / 3 groups = 4 runs per group per day
  }
}
