const FirecrawlApp = require('@mendable/firecrawl-js').default;

async function testSite(url, name) {
  try {
    console.log(`Testing ${name}...`);
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    const result = await app.scrape(url, {
      formats: ['markdown'],
      timeout: 15000
    });
    
    console.log(`✓ ${name} - WORKS! Status: ${result.metadata?.statusCode}\n`);
    return true;
  } catch (error) {
    console.error(`✗ ${name} - BLOCKED: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('=== TESTING RENTAL SITES ===\n');
  
  const sites = [
    // Already tested
    { url: 'https://www.zillow.com/homes/for_rent/', name: 'Zillow' },
    { url: 'https://www.apartments.com/new-york-ny/', name: 'Apartments.com' },
    
    // Facebook
    { url: 'https://www.facebook.com/marketplace/category/propertyrentals', name: 'Facebook Marketplace' },
    
    // Other major sites
    { url: 'https://www.trulia.com/for_rent/New_York,NY/', name: 'Trulia' },
    { url: 'https://www.rent.com/new-york/', name: 'Rent.com' },
    { url: 'https://hotpads.com/new-york-ny/apartments-for-rent', name: 'HotPads' },
    { url: 'https://www.realtor.com/apartments/New-York_NY', name: 'Realtor.com' },
    { url: 'https://www.forrent.com/ny/new-york', name: 'ForRent.com' },
    { url: 'https://www.apartmentguide.com/apartments/New-York/', name: 'ApartmentGuide' },
    { url: 'https://www.rentals.com/New-York/', name: 'Rentals.com' },
    { url: 'https://www.apartmentlist.com/ny/new-york', name: 'ApartmentList' },
    { url: 'https://www.zumper.com/apartments-for-rent/new-york-ny', name: 'Zumper' },
    { url: 'https://www.padmapper.com/apartments/new-york-ny', name: 'PadMapper' },
    
    // NYC specific
    { url: 'https://streeteasy.com/for-rent/nyc', name: 'StreetEasy' },
    { url: 'https://www.nakedapartments.com/nyc/apartments-for-rent', name: 'Naked Apartments' },
    { url: 'https://www.renthop.com/search/nyc', name: 'RentHop' },
  ];
  
  const working = [];
  const blocked = [];
  
  for (const site of sites) {
    const works = await testSite(site.url, site.name);
    if (works) {
      working.push(site.name);
    } else {
      blocked.push(site.name);
    }
  }
  
  console.log('\n=== RESULTS ===');
  console.log(`\n✓ WORKING (${working.length}):`);
  working.forEach(name => console.log(`  - ${name}`));
  
  console.log(`\n✗ BLOCKED (${blocked.length}):`);
  blocked.forEach(name => console.log(`  - ${name}`));
}

main();
