/**
 * LeaseIQ - Complete Usage Example
 * 
 * This script demonstrates all major features:
 * 1. Search for listings
 * 2. Create a saved search with alerts
 * 3. Research a listing
 * 4. Analyze a lease
 */

import mongoose from 'mongoose';
import { config } from '../src/config';
import { SearchService, AlertService, ResearchService, LeaseService } from '../src/services';
import { User, SavedSearch } from '../src/models';

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✓ Connected\n');

    // ============================================
    // 1. SEARCH FOR LISTINGS
    // ============================================
    console.log('=== SEARCHING FOR LISTINGS ===');
    const searchResults = await SearchService.search({
      minPrice: 2000,
      maxPrice: 3500,
      minBedrooms: 2,
      neighborhoods: ['Williamsburg', 'Bushwick'],
      petsAllowed: true,
      noFee: true,
    }, {
      limit: 5,
      sortBy: 'price',
      sortOrder: 'asc',
    });

    console.log(`Found ${searchResults.total} listings`);
    console.log(`Showing ${searchResults.listings.length} results:\n`);
    
    searchResults.listings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.address.street}`);
      console.log(`   $${listing.price.amount}/mo | ${listing.bedrooms} bed | ${listing.bathrooms} bath`);
      console.log(`   ${listing.address.neighborhood}, ${listing.address.city}`);
      console.log();
    });

    // ============================================
    // 2. CREATE USER AND SAVED SEARCH
    // ============================================
    console.log('=== CREATING SAVED SEARCH ===');
    
    // Create test user (in production, this would come from Supabase)
    let user = await User.findOne({ email: 'demo@leaseiq.app' });
    if (!user) {
      user = await User.create({
        supabaseId: 'demo-user-123',
        email: 'demo@leaseiq.app',
      });
      console.log('✓ Created demo user');
    } else {
      console.log('✓ Using existing demo user');
    }

    // Create saved search
    const savedSearch = await SavedSearch.create({
      userId: user._id,
      name: '2BR in Williamsburg - Pet Friendly',
      criteria: {
        minPrice: 2000,
        maxPrice: 3500,
        minBedrooms: 2,
        maxBedrooms: 2,
        neighborhoods: ['Williamsburg'],
        petsAllowed: true,
        noFee: true,
      },
      alertsEnabled: true,
      alertFrequency: 'immediate',
      alertMethod: 'email',
    });

    console.log(`✓ Created saved search: "${savedSearch.name}"`);
    console.log(`  Alerts: ${savedSearch.alertsEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Frequency: ${savedSearch.alertFrequency}`);
    console.log();

    // ============================================
    // 3. SEND TEST ALERT
    // ============================================
    console.log('=== SENDING TEST ALERT ===');
    const alertResult = await AlertService.sendImmediateAlert(savedSearch._id.toString());
    
    if (alertResult.success) {
      console.log('✓ Alert sent successfully!');
      console.log(`  Check ${user.email} for the email`);
    } else {
      console.log('✗ Alert failed:', alertResult.error);
    }
    console.log();

    // ============================================
    // 4. RESEARCH A LISTING
    // ============================================
    if (searchResults.listings.length > 0) {
      console.log('=== RESEARCHING LISTING ===');
      const listing = searchResults.listings[0];
      console.log(`Researching: ${listing.address.street}`);
      
      const research = await ResearchService.researchListing(listing);
      console.log('\nResearch Summary:');
      console.log(research.summary);
      
      if (research.landlordReviews) {
        console.log('\nLandlord Reviews:');
        console.log(research.landlordReviews.substring(0, 200) + '...');
      }
      
      if (research.violations) {
        console.log('\nBuilding Violations:');
        console.log(research.violations.substring(0, 200) + '...');
      }
      console.log();
    }

    // ============================================
    // 5. ANALYZE A LEASE
    // ============================================
    console.log('=== ANALYZING LEASE ===');
    const sampleLease = `
      RESIDENTIAL LEASE AGREEMENT
      
      This lease agreement is made between John Doe (Landlord) and Jane Smith (Tenant).
      
      RENT: The monthly rent is $2,500, due on the 1st of each month.
      
      SECURITY DEPOSIT: Tenant shall pay a security deposit of $2,500.
      
      LEASE TERM: This lease is for 12 months, beginning January 1, 2024.
      
      LATE FEES: A late fee of $100 will be charged for rent paid after the 5th.
      
      PETS: No pets allowed without written permission. Pet deposit of $500 required.
      
      UTILITIES: Tenant is responsible for all utilities except water.
      
      TERMINATION: Either party may terminate with 60 days written notice.
    `;

    const analysis = await LeaseService.analyzeLease(sampleLease);
    console.log('\nLease Analysis:');
    console.log('Summary:', analysis.summary);
    console.log('\nKey Terms:');
    console.log('  Rent:', analysis.keyTerms.rent || 'N/A');
    console.log('  Deposit:', analysis.keyTerms.deposit || 'N/A');
    console.log('  Term:', analysis.keyTerms.term || 'N/A');
    console.log('  Fees:', analysis.keyTerms.fees || 'N/A');
    
    if (analysis.redFlags.length > 0) {
      console.log('\n⚠️  Red Flags:');
      analysis.redFlags.forEach((flag, i) => {
        console.log(`  ${i + 1}. ${flag}`);
      });
    } else {
      console.log('\n✓ No major red flags detected');
    }
    console.log();

    // ============================================
    // DONE
    // ============================================
    console.log('=== DEMO COMPLETE ===');
    console.log('\nAll features demonstrated successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the API server: npm run dev');
    console.log('2. Start the alert cron: npm run alerts');
    console.log('3. Check the API documentation: API.md');
    console.log('4. Build a frontend or integrate with your app');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the example
main();
