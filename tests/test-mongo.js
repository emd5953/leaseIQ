const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  console.log('Testing MongoDB connection...');
  console.log('URI (sanitized):', uri.replace(/\/\/[^@]+@/, '//***:***@'));
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    tls: true,
    tlsAllowInvalidCertificates: true, // Temporary workaround for Node 22
  });

  try {
    console.log('\nAttempting to connect...');
    await client.connect();
    console.log('✓ Successfully connected to MongoDB!');
    
    console.log('\nTesting database access...');
    const db = client.db('leaseiq');
    const collections = await db.listCollections().toArray();
    console.log('✓ Database accessible');
    console.log('Collections:', collections.map(c => c.name));
    
    console.log('\nConnection test PASSED ✓');
  } catch (error) {
    console.error('\n✗ Connection test FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('\nThis appears to be an SSL/TLS error.');
      console.error('Possible causes:');
      console.error('1. Node.js version incompatibility (try Node 20 LTS)');
      console.error('2. Network/firewall blocking the connection');
      console.error('3. MongoDB Atlas IP whitelist not configured');
    } else if (error.message.includes('authentication')) {
      console.error('\nThis appears to be an authentication error.');
      console.error('Check your username and password in MongoDB Atlas.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\nCannot resolve MongoDB hostname.');
      console.error('Check your internet connection and DNS settings.');
    }
  } finally {
    await client.close();
  }
}

testConnection();
