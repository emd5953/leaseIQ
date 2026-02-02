const mongoose = require('mongoose');
require('dotenv').config();

async function verifyListings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Listing = mongoose.model('Listing', new mongoose.Schema({}, { strict: false }));
    
    const [total, ny, newYork, recent] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ 'address.state': 'NY' }),
      Listing.countDocuments({ 'address.state': 'New York' }),
      Listing.find().sort({ createdAt: -1 }).limit(3).lean()
    ]);
    
    console.log('=== DATABASE STATUS ===');
    console.log('Total listings:', total);
    console.log('NY state:', ny);
    console.log('New York state:', newYork);
    console.log('\nRecent listings:');
    recent.forEach((l, i) => {
      console.log(`${i+1}. ${l.address.fullAddress}`);
      console.log(`   Price: $${l.price.amount}, Beds: ${l.bedrooms}, Baths: ${l.bathrooms}`);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verifyListings();
