import mongoose from 'mongoose';
import { config } from '../src/config';
import { SavedSearch, User, Listing, AlertHistory } from '../src/models';
import { AlertService } from '../src/services/alert.service';

async function verifyCronJobs() {
  try {
    console.log('🔍 Verifying Cron Jobs Configuration\n');
    console.log('='.repeat(60));

    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // 1. Check Scraping Status
    console.log('📊 SCRAPING STATUS');
    console.log('-'.repeat(60));
    
    const totalListings = await Listing.countDocuments();
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('createdAt address.city price bedrooms')
      .lean();

    console.log(`Total listings in DB: ${totalListings}`);
    console.log(`\nMost recent listings:`);
    recentListings.forEach((listing, i) => {
      const age = Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60));
      console.log(`  ${i + 1}. ${listing.address?.city || 'Unknown'} - $${listing.price} - ${age}h ago`);
    });

    if (recentListings.length > 0) {
      const newestAge = Math.floor((Date.now() - new Date(recentListings[0].createdAt).getTime()) / (1000 * 60 * 60));
      if (newestAge > 6) {
        console.log(`\n⚠️  WARNING: Newest listing is ${newestAge} hours old`);
        console.log('   Scraping may not be running on schedule!');
      } else {
        console.log(`\n✓ Scraping appears to be working (newest listing: ${newestAge}h ago)`);
      }
    }

    // 2. Check Alert System
    console.log('\n\n📧 ALERT SYSTEM STATUS');
    console.log('-'.repeat(60));

    const totalUsers = await User.countDocuments();
    const totalSavedSearches = await SavedSearch.countDocuments();
    const activeSavedSearches = await SavedSearch.countDocuments({ isActive: true });
    const totalAlertHistory = await AlertHistory.countDocuments();

    console.log(`Total users: ${totalUsers}`);
    console.log(`Total saved searches: ${totalSavedSearches}`);
    console.log(`Active saved searches: ${activeSavedSearches}`);
    console.log(`Total alerts sent (history): ${totalAlertHistory}`);

    if (activeSavedSearches === 0) {
      console.log('\n⚠️  No active saved searches found');
      console.log('   Alerts won\'t be sent until users create saved searches');
    }

    // Get recent alert history
    const recentAlerts = await AlertHistory.find()
      .sort({ sentAt: -1 })
      .limit(5)
      .populate('userId', 'email')
      .populate('savedSearchId', 'name')
      .lean();

    if (recentAlerts.length > 0) {
      console.log(`\nRecent alerts sent:`);
      recentAlerts.forEach((alert, i) => {
        const age = Math.floor((Date.now() - new Date(alert.sentAt).getTime()) / (1000 * 60));
        const user = alert.userId as any;
        const search = alert.savedSearchId as any;
        console.log(`  ${i + 1}. ${user?.email || 'Unknown'} - "${search?.name || 'Unknown'}" - ${alert.listingIds.length} listings - ${age}m ago - ${alert.deliveryStatus}`);
      });

      const newestAlertAge = Math.floor((Date.now() - new Date(recentAlerts[0].sentAt).getTime()) / (1000 * 60));
      if (newestAlertAge > 30 && activeSavedSearches > 0) {
        console.log(`\n⚠️  WARNING: Last alert was ${newestAlertAge} minutes ago`);
        console.log('   Alert cron may not be running!');
      } else {
        console.log(`\n✓ Alerts appear to be working (last alert: ${newestAlertAge}m ago)`);
      }
    } else {
      console.log('\n⚠️  No alert history found');
      console.log('   Either alerts haven\'t run yet, or no new listings matched searches');
    }

    // 3. Test Alert Service
    console.log('\n\n🧪 TESTING ALERT SERVICE');
    console.log('-'.repeat(60));

    if (activeSavedSearches > 0) {
      console.log('Running alert service test...');
      const result = await AlertService.processAlerts();
      console.log(`✓ Alert service executed:`);
      console.log(`  - Processed: ${result.processed} searches`);
      console.log(`  - Sent: ${result.sent} alerts`);
      console.log(`  - Errors: ${result.errors}`);

      if (result.sent > 0) {
        console.log('\n✅ Alert system is WORKING!');
      } else if (result.processed > 0 && result.sent === 0) {
        console.log('\n⚠️  Alert system processed searches but sent no alerts');
        console.log('   This is normal if there are no new listings matching the criteria');
      }
    } else {
      console.log('⚠️  Skipping test - no active saved searches');
    }

    // 4. Configuration Check
    console.log('\n\n⚙️  CONFIGURATION');
    console.log('-'.repeat(60));
    console.log('Scraping schedule (render.yaml): Every 6 hours (0 */6 * * *)');
    console.log('Scraping schedule (code): Every 15 minutes (*/15 * * * *)');
    console.log('Alert schedule (render.yaml): Every 15 minutes (*/15 * * * *)');
    console.log('Alert schedule (code): Every 15 minutes (*/15 * * * *)');
    console.log('\n⚠️  MISMATCH: Scraping config differs between code and Render!');
    console.log('   Render config takes precedence (every 6 hours)');

    // 5. Recommendations
    console.log('\n\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(60));
    
    if (totalListings < 50) {
      console.log('⚠️  Low listing count - consider running scraper manually');
    }
    
    if (activeSavedSearches === 0) {
      console.log('⚠️  No active saved searches - alerts won\'t be sent');
      console.log('   Create test saved searches to verify alert system');
    }

    const oldestListing = await Listing.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
    if (oldestListing) {
      const dataAge = Math.floor((Date.now() - new Date(oldestListing.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\nData age: Oldest listing is ${dataAge} days old`);
      if (dataAge > 30) {
        console.log('⚠️  Consider cleaning up old listings');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Verification complete\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verifyCronJobs();
