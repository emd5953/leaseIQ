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
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ MongoDB connected');

    // Run once daily at 6am UTC
    cron.schedule('0 6 * * *', runScrapingJob);
    console.log('✓ Scraping cron job scheduled (daily at 6am UTC)');

    // Run immediately on startup
    await runScrapingJob();
  } catch (error) {
    console.error('Failed to start scraping cron:', error);
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
