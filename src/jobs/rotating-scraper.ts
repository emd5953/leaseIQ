import { ListingSource } from '../ingestion/types';

/**
 * High-frequency StreetEasy scraper for competitive apartment alerts.
 * The source group remains an array so the scheduler contract stays stable
 * if additional sources are introduced later.
 */
export class RotatingScraper {
  private sourceGroups: ListingSource[][] = [[ListingSource.STREETEASY]];

  // Configuration for different phases
  private readonly INTERVAL_MINUTES = 15; // 15-minute interval for better API stability

  /**
   * Get sources to scrape based on current interval
   * With 96 runs per day (every 15 min), StreetEasy runs every interval.
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
