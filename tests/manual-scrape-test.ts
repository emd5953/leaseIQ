import mongoose from 'mongoose';
import { ScrapingOrchestrator } from '../src/ingestion/services/orchestrator';
import { config } from '../src/config';
import { Listing } from '../src/models';

async function manualScrapeTest() {
  console.log('🔄 Manual Scraping Test\n');
  console.log('='.repeat(60));

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // Check current state
    const beforeCount = await Listing.countDocuments();
    const beforeRecent = await Listing.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
    
    console.log('📊 Before Scraping:');
    console.log(`  Total listings: ${beforeCount}`);
    if (beforeRecent) {
      const age = Math.floor((Date.now() - new Date(beforeRecent.createdAt).getTime()) / (1000 * 60 * 60));
      console.log(`  Newest listing: ${age} hours ago`);
    }

    // Run scraping
    console.log('\n🔄 Starting scraping job...\n');
    const startTime = Date.now();
    
    const orchestrator = new ScrapingOrchestrator();
    const result = await orchestrator.runFullScrape();
    
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Check after state
    const afterCount = await Listing.countDocuments();
    const afterRecent = await Listing.findOne().sort({ createdAt: -1 }).select('createdAt address.city price bedrooms').lean();

    console.log('\n' + '='.repeat(60));
    console.log('✓ Scraping Complete!\n');
    
    console.log('📈 Results:');
    console.log(`  Duration: ${duration} seconds`);
    console.log(`  Total scraped: ${result.totalListingsScraped}`);
    console.log(`  New added: ${result.newListingsAdded}`);
    console.log(`  Duplicates: ${result.duplicatesDetected}`);
    console.log(`  Errors: ${result.errorsEncountered}`);
    
    console.log('\n📊 After Scraping:');
    console.log(`  Total listings: ${afterCount} (was ${beforeCount})`);
    console.log(`  Net change: +${afterCount - beforeCount}`);
    
    if (afterRecent) {
      const age = Math.floor((Date.now() - new Date(afterRecent.createdAt).getTime()) / (1000 * 60));
      console.log(`  Newest listing: ${age} minutes ago`);
      console.log(`  Location: ${afterRecent.address?.city || 'Unknown'}`);
      console.log(`  Price: $${afterRecent.price}`);
      console.log(`  Bedrooms: ${afterRecent.bedrooms}`);
    }

    if (result.newListingsAdded > 0) {
      console.log('\n✅ SUCCESS: New listings added!');
    } else if (result.totalListingsScraped > 0) {
      console.log('\n⚠️  Scraping worked but all listings were duplicates');
    } else {
      console.log('\n❌ No listings scraped - check for errors');
    }

    if (result.errorsEncountered > 0) {
      console.log(`\n⚠️  ${result.errorsEncountered} errors encountered during scraping`);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  }
}

manualScrapeTest();
