import FirecrawlApp from '@mendable/firecrawl-js';

async function testSite(url: string, name: string) {
  try {
    console.log(`\nTesting ${name}: ${url}`);
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    const result = await app.scrape(url, {
      formats: ['markdown'],
      timeout: 15000
    });
    
    console.log(`✓ ${name} - Success! Status: ${result.metadata?.statusCode}`);
    return true;
  } catch (error: any) {
    console.error(`✗ ${name} - Error: ${error.message || error}`);
    return false;
  }
}

async function main() {
  console.log('Testing rental listing sites with Firecrawl...\n');
  
  const sites = [
    { url: 'https://www.zillow.com/homes/for_rent/', name: 'Zillow' },
    { url: 'https://www.apartments.com/new-york-ny/', name: 'Apartments.com' },
    { url: 'https://newyork.craigslist.org/search/apa', name: 'Craigslist' },
  ];
  
  for (const site of sites) {
    await testSite(site.url, site.name);
  }
}

main();
