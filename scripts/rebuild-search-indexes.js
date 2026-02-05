/**
 * Rebuild search indexes for optimal query performance
 * Run this after updating index definitions in listing.model.ts
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function rebuildIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');

    const db = mongoose.connection.db;
    const collection = db.collection('listings');

    console.log('\nDropping old indexes...');
    const existingIndexes = await collection.indexes();
    console.log('Current indexes:', existingIndexes.map(i => i.name));

    // Drop all indexes except _id
    for (const index of existingIndexes) {
      if (index.name !== '_id_') {
        console.log(`Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }

    console.log('\nCreating optimized indexes...');
    
    // Primary search index - covers most queries
    await collection.createIndex(
      { 
        isActive: 1, 
        'address.state': 1, 
        'address.city': 1,
        'price.amount': 1,
        bedrooms: 1,
        createdAt: -1 
      },
      { name: 'search_primary', background: true }
    );
    console.log('✓ Created primary search index');

    // Fast recent listings
    await collection.createIndex(
      { isActive: 1, createdAt: -1 },
      { name: 'recent_active', background: true }
    );
    console.log('✓ Created recent active listings index');

    // Geospatial queries
    await collection.createIndex(
      { 'address.coordinates': '2dsphere' },
      { name: 'geo_location', background: true }
    );
    console.log('✓ Created geospatial index');

    // Deduplication
    await collection.createIndex(
      { 'address.street': 1, 'address.unit': 1 },
      { name: 'dedup_address', background: true }
    );
    console.log('✓ Created deduplication index');

    // Pet policy
    await collection.createIndex(
      { 'petPolicy.dogsAllowed': 1, 'petPolicy.catsAllowed': 1 },
      { name: 'pet_policy', background: true }
    );
    console.log('✓ Created pet policy index');

    // Broker fee
    await collection.createIndex(
      { 'brokerFee.required': 1 },
      { name: 'broker_fee', background: true }
    );
    console.log('✓ Created broker fee index');

    // Source lookups
    await collection.createIndex(
      { 'sources.sourceId': 1, 'sources.sourceName': 1 },
      { name: 'source_lookup', background: true }
    );
    console.log('✓ Created source lookup index');

    console.log('\n✅ All indexes rebuilt successfully!');
    
    // Show final indexes
    const newIndexes = await collection.indexes();
    console.log('\nFinal indexes:');
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Get collection stats
    const stats = await db.command({ collStats: 'listings' });
    console.log(`\nCollection stats:`);
    console.log(`  Documents: ${stats.count}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('Error rebuilding indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

rebuildIndexes();
