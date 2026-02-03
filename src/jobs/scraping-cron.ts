import cron from 'node-cron';
import mongoose from 'mongoose';
import { ScrapingOrchestrator } from '../ingestion/services/orchestrator';
import { config } from '../config';

async function runScrapingJob() {
  console.log(`[${new Date().toISOString()}] Running scraping job...`);
  
  try {
    const orchestrator = new ScrapingOrchestrator();
    const result = await orchestrator.runFullScrape();
    console.log(`[${new Date().toISOString()}] Scraping job complete:`, {
      totalListingsScraped: result.totalListingsScraped,
      newListingsAdded: result.newListingsAdded,
      duplicatesDetected: result.duplicatesDetected,
      errorsEncountered: result.errorsEncountered,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scraping job failed:`, error);
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

    // Run once daily at 6am UTC
    cron.schedule('0 6 * * *', runScrapingJob);
    console.log('✓ Scraping cron job scheduled (daily at 6am UTC)');

    // Run immediately on startup
    console.log('Running initial scraping job...');
    await runScrapingJob();
    console.log('✓ Initial scraping job completed');
    
    // Keep process alive
    console.log('Scraping cron service running. Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Failed to start scraping cron:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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
