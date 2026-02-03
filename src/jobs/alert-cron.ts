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
    // Validate environment variables
    if (!config.mongodb.uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    if (!config.resend.apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set - email alerts will not work');
    }
    
    console.log('Environment check passed');
    console.log('MongoDB URI:', config.mongodb.uri.substring(0, 20) + '...');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✓ MongoDB connected');

    // Run the alert job once (Render cron jobs run once per trigger)
    console.log('Running alert job...');
    await runAlertJob();
    console.log('✓ Alert job completed');
    
    // Close connection and exit
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run alert cron:', error);
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
  console.log('\nShutting down alert cron...');
  await mongoose.connection.close();
  process.exit(0);
});

startAlertCron();
