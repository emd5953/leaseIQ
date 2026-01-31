import FirecrawlApp from '@mendable/firecrawl-js';

async function testSite(url: string, name: string) {
  try {
    console.log(`Testing ${name}...`);
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    const result = await app.scrape(url, {
      formats: ['markdown'],
      timeout: 15000
    });
    
    console.log(`✓ ${name} - Works! Status: ${result.metadata?.statusCode}\n`);
    return true;
  } catch (error: any) {
    console.error(`✗ ${name} - Blocked: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('Testing rental sites...\n');
  
  const sites = [
    { url: 'https://www.zillow.com/homes/for_rent/', name: 'Zillow' },
    { url: 'https://www.apartments.com/new-york-ny/', name: 'Apartments.com' },
    { url: 'https://www.trulia.com/for_rent/New_York,NY/', name: 'Trulia' },
    { url: 'https://www.rent.com/new-york/', name: 'Rent.com' },
    { url: 'https://hotpads.com/new-york-ny/apartments-for-rent', name: 'HotPads' },
    { url: 'https://www.realtor.com/apartments/New-York_NY', name: 'Realtor.com' },
    { url: 'https://www.forrent.com/ny/new-york', name: 'ForRent.com' },
  ];
  
  for (const site of sites) {
    await testSite(site.url, site.name);
  }
}

main();
