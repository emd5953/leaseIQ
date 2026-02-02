import mongoose from 'mongoose';
import { Listing } from '../src/models';
import { config } from '../src/config';

async function checkListings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // Count total listings
    const totalCount = await Listing.countDocuments();
    console.log(`Total listings in database: ${totalCount}`);

    // Count active listings
    const activeCount = await Listing.countDocuments({ isActive: true });
    console.log(`Active listings: ${activeCount}`);

    // Count NYC listings
    const nycCount = await Listing.countDocuments({
      $or: [
        { 'address.state': 'NY' },
        { 'address.state': 'New York' },
        { 'address.city': { $in: ['New York', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] } },
      ]
    });
    console.log(`NYC listings: ${nycCount}\n`);

    // Get a sample listing
    const sampleListing = await Listing.findOne().lean();
    if (sampleListing) {
      console.log('Sample listing:');
      console.log(`  ID: ${sampleListing._id}`);
      console.log(`  Title: ${sampleListing.title || 'N/A'}`);
      console.log(`  Address: ${JSON.stringify(sampleListing.address)}`);
      console.log(`  Price: ${JSON.stringify(sampleListing.price)}`);
      console.log(`  Bedrooms: ${sampleListing.bedrooms}`);
      console.log(`  Active: ${sampleListing.isActive}`);
      console.log(`  Created: ${sampleListing.createdAt}`);
    } else {
      console.log('⚠️  No listings found in database!');
    }

    // Check recent listings
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title address.city price bedrooms createdAt')
      .lean();
    
    console.log('\nMost recent 5 listings:');
    recentListings.forEach((listing, i) => {
      console.log(`  ${i + 1}. ${listing._id} - ${listing.address?.city || 'Unknown'} - $${listing.price?.amount || listing.price} - ${listing.bedrooms}BR - ${new Date(listing.createdAt).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  }
}

checkListings();
