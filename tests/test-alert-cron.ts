import mongoose from 'mongoose';
import { config } from '../src/config';
import { AlertService } from '../src/services/alert.service';

async function testAlertCron() {
  console.log('=== Testing Alert Cron Job ===\n');

  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log('   MONGODB_URI:', config.mongodb.uri ? '✓ Set' : '✗ Missing');
  console.log('   RESEND_API_KEY:', config.resend.apiKey ? '✓ Set' : '✗ Missing');
  console.log('');

  if (!config.mongodb.uri) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
  }

  if (!config.resend.apiKey) {
    console.warn('⚠️  RESEND_API_KEY not set - emails will fail');
  }

  // 2. Test MongoDB connection
  console.log('2. Testing MongoDB connection...');
  try {
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('   ✓ MongoDB connected successfully');
    console.log('   Database:', mongoose.connection.db?.databaseName);
  } catch (error) {
    console.error('   ❌ MongoDB connection failed:', error);
    process.exit(1);
  }

  // 3. Test alert processing
  console.log('\n3. Testing alert processing...');
  try {
    const result = await AlertService.processAlerts();
    console.log('   ✓ Alert processing completed');
    console.log('   Results:', result);
  } catch (error) {
    console.error('   ❌ Alert processing failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }

  // Cleanup
  await mongoose.connection.close();
  console.log('\n✓ Test complete');
}

testAlertCron().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
