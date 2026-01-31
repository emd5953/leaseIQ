import dotenv from 'dotenv';
import { initializeConnection, closeConnection, isMongoConnected } from '../src/db/connection';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('Testing MongoDB connection...\n');
  
  try {
    // Test 1: Check if MONGODB_URI is set
    console.log('✓ MONGODB_URI is set:', process.env.MONGODB_URI ? 'Yes' : 'No');
    if (!process.env.MONGODB_URI) {
      console.error('✗ MONGODB_URI environment variable is not set in .env file');
      process.exit(1);
    }
    
    // Test 2: Attempt connection
    console.log('\nAttempting to connect to MongoDB...');
    await initializeConnection();
    
    // Test 3: Verify connection status
    if (isMongoConnected()) {
      console.log('✓ Successfully connected to MongoDB!');
      console.log('✓ Connection is active and ready\n');
      
      // Test 4: Close connection
      console.log('Testing connection close...');
      await closeConnection();
      console.log('✓ Connection closed successfully\n');
      
      console.log('🎉 All connection tests passed!');
      process.exit(0);
    } else {
      console.error('✗ Connection established but status check failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Connection test failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testConnection();
