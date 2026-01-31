import cron from 'node-cron';
import mongoose from 'mongoose';
import { AlertService } from '../services/alert.service';
import { config } from '../config';

async function runAlertJob() {
  console.log(`[${new Date().toISOString()}] Running alert job...`);
  
  try {
    const result = await AlertService.processAlerts();
    console.log(`[${new Date().toISOString()}] Alert job complete:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Alert job failed:`, error);
  }
}

async function startAlertCron() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✓ MongoDB connected');

    // Run every 15 minutes
    cron.schedule('*/15 * * * *', runAlertJob);
    console.log('✓ Alert cron job scheduled (every 15 minutes)');

    // Run immediately on startup
    await runAlertJob();
  } catch (error) {
    console.error('Failed to start alert cron:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down alert cron...');
  await mongoose.connection.close();
  process.exit(0);
});

startAlertCron();
