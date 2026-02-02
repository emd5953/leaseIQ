/**
 * Cleanup script to remove non-NYC listings from the database
 * Run with: node scripts/cleanup-non-nyc-listings.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// NYC coordinate boundaries
const NYC_BOUNDS = {
  minLat: 40.4774,  // Southern tip of Staten Island
  maxLat: 40.9176,  // Northern Bronx
  minLng: -74.2591, // Western Staten Island
  maxLng: -73.7004, // Eastern Queens
};

// Valid NYC zip code ranges
const NYC_ZIP_RANGES = [
  { min: 10001, max: 10282 }, // Manhattan
  { min: 10301, max: 10314 }, // Staten Island
  { min: 10451, max: 10475 }, // Bronx
  { min: 11004, max: 11109 }, // Queens
  { min: 11201, max: 11256 }, // Brooklyn
];

function isNYCZipCode(zip) {
  if (!zip) return false;
  const zipNum = parseInt(zip);
  return NYC_ZIP_RANGES.some(range => zipNum >= range.min && zipNum <= range.max);
}

async function cleanupNonNYCListings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const Listing = mongoose.model('Listing', new mongoose.Schema({}, { strict: false }));

    // Get all listings
    const allListings = await Listing.find({}).lean();
    console.log(`\nTotal listings in database: ${allListings.length}`);

    const toDelete = [];
    const toKeep = [];

    for (const listing of allListings) {
      let isNYC = false;

      // Check coordinates
      if (listing.address?.coordinates?.coordinates) {
        const [lng, lat] = listing.address.coordinates.coordinates;
        if (
          lat >= NYC_BOUNDS.minLat &&
          lat <= NYC_BOUNDS.maxLat &&
          lng >= NYC_BOUNDS.minLng &&
          lng <= NYC_BOUNDS.maxLng
        ) {
          isNYC = true;
        }
      }

      // Check state
      if (!isNYC && listing.address?.state) {
        const state = listing.address.state;
        if (state !== 'NY' && state !== 'New York') {
          toDelete.push(listing);
          continue;
        }
      }

      // Check zip code
      if (!isNYC && listing.address?.zipCode) {
        if (isNYCZipCode(listing.address.zipCode)) {
          isNYC = true;
        }
      }

      // Check city
      if (!isNYC && listing.address?.city) {
        const cityLower = listing.address.city.toLowerCase();
        const nycCities = ['new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'];
        if (nycCities.some(c => cityLower.includes(c))) {
          isNYC = true;
        }
      }

      if (isNYC) {
        toKeep.push(listing);
      } else {
        toDelete.push(listing);
      }
    }

    console.log(`\nListings to keep (NYC): ${toKeep.length}`);
    console.log(`Listings to delete (non-NYC): ${toDelete.length}`);

    if (toDelete.length > 0) {
      console.log('\nSample non-NYC listings to be deleted:');
      toDelete.slice(0, 5).forEach(listing => {
        console.log(`  - ${listing.address?.fullAddress || listing.address?.street || 'Unknown'}`);
        console.log(`    State: ${listing.address?.state}, City: ${listing.address?.city}`);
      });

      console.log('\nDeleting non-NYC listings...');
      const deleteIds = toDelete.map(l => l._id);
      const result = await Listing.deleteMany({ _id: { $in: deleteIds } });
      console.log(`✓ Deleted ${result.deletedCount} non-NYC listings`);
    } else {
      console.log('\n✓ No non-NYC listings found. Database is clean!');
    }

    console.log('\nCleanup complete!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupNonNYCListings();
