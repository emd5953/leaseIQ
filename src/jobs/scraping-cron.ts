import mongoose from 'mongoose';
import { ScrapingOrchestrator } from '../ingestion/services/orchestrator';
import { RotatingScraper } from './rotating-scraper';
import { config } from '../config';

async function runScrapingJob() {
  console.log(`[${new Date().toISOString()}] Running high-frequency scraping job...`);
  
  try {
    const orchestrator = new ScrapingOrchestrator();
    const rotator = new RotatingScraper();
    
    // Get current source from rotation (changes every 30 minutes)
    const sources = rotator.getCurrentSources();
    console.log(`[${new Date().toISOString()}] Scraping sources:`, sources);
    console.log(`[${new Date().toISOString()}] Each source runs ${rotator.getRunsPerDay()} times per day`);
    console.log(`[${new Date().toISOString()}] Max listing age: ${rotator.getMaxFreshness()} hours`);
    
    // Run with timeout protection (55 seconds to allow cleanup time)
    const timeoutMs = 55000; // 55 seconds
    const result = await Promise.race([
      orchestrator.runPartialScrape(sources),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Scraping timeout - job exceeded 55 seconds')), timeoutMs)
      )
    ]);
    
    console.log(`[${new Date().toISOString()}] Scraping job complete:`, {
      totalListingsScraped: result.totalListingsScraped,
      newListingsAdded: result.newListingsAdded,
      duplicatesDetected: result.duplicatesDetected,
      errorsEncountered: result.errorsEncountered,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scraping job failed:`, error);
    throw error; // Re-throw to ensure proper exit code
  }
}

async function startScrapingCron() {
  try {
    // Validate environment variables
    if (!config.mongodb.uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    if (!config.firecrawl.apiKey) {
      console.warn('⚠️  FIRECRAWL_API_KEY not set - scraping may not work');
    }
    
    console.log('Environment check passed');
    console.log('MongoDB URI:', config.mongodb.uri.substring(0, 20) + '...');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ MongoDB connected');

    // Run the scraping job once (Render cron jobs run once per trigger)
    console.log('Running scraping job...');
    await runScrapingJob();
    console.log('✓ Scraping job completed');
    
    // Close connection and exit
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run scraping cron:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down scraping cron...');
  await mongoose.connection.close();
  process.exit(0);
});

startScrapingCron();
