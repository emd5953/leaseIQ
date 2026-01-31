/**
 * Example usage of the listing ingestion pipeline
 * 
 * This demonstrates how to use the orchestrator to scrape listings
 */

import mongoose from 'mongoose';
import { ScrapingOrchestrator } from './services/orchestrator';
import { config, validateConfig } from './config';
import { ListingSource } from './types';

async function main() {
  try {
    // Validate configuration
    console.log('Validating configuration...');
    validateConfig();

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Create orchestrator
    const orchestrator = new ScrapingOrchestrator();

    // Run a full scrape (all sources)
    console.log('Starting full scrape...');
    const result = await orchestrator.runFullScrape();

    console.log('Scraping completed!');
    console.log('Results:', {
      jobId: result.jobId,
      totalListingsScraped: result.totalListingsScraped,
      newListingsAdded: result.newListingsAdded,
      duplicatesDetected: result.duplicatesDetected,
      errorsEncountered: result.errorsEncountered,
      duration: result.endTime.getTime() - result.startTime.getTime(),
    });

    // Or run a partial scrape (specific sources)
    // const result = await orchestrator.runPartialScrape([
    //   ListingSource.STREETEASY,
    //   ListingSource.ZILLOW,
    // ]);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
