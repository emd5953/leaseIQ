import mongoose from 'mongoose';
import { config } from '../src/config';
import { SearchService } from '../src/services/search.service';

async function testApiEndpoint() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // Test getting a listing by ID
    const listingId = '697ff81a0e89d326d15befc8'; // From the recent listings
    console.log(`Testing getListingById with ID: ${listingId}`);
    
    const listing = await SearchService.getListingById(listingId);
    
    if (listing) {
      console.log('✓ Listing found!');
      console.log(`  ID: ${listing._id}`);
      console.log(`  Title: ${listing.title}`);
      console.log(`  Address: ${listing.address}`);
      console.log(`  Price: $${listing.price}`);
      console.log(`  Bedrooms: ${listing.bedrooms}`);
      console.log(`  Source: ${listing.source}`);
      console.log(`  Source URL: ${listing.sourceUrl || 'N/A'}`);
    } else {
      console.log('✗ Listing not found!');
    }

    // Test with an invalid ID
    console.log('\n\nTesting with invalid ID format...');
    try {
      const invalidListing = await SearchService.getListingById('invalid-id-123');
      console.log('Result:', invalidListing);
    } catch (error: any) {
      console.log('✓ Expected error:', error.message);
    }

    // Test search endpoint
    console.log('\n\nTesting search endpoint...');
    const searchResult = await SearchService.search({}, { limit: 5 });
    console.log(`Found ${searchResult.total} total listings`);
    console.log(`Returned ${searchResult.listings.length} listings`);
    
    if (searchResult.listings.length > 0) {
      console.log('\nFirst listing from search:');
      const first = searchResult.listings[0];
      console.log(`  ID: ${first._id}`);
      console.log(`  Title: ${first.title}`);
      console.log(`  Address: ${first.address}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  }
}

testApiEndpoint();
