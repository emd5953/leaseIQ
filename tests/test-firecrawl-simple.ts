import FirecrawlApp from '@mendable/firecrawl-js';

async function test() {
  try {
    console.log('Testing Firecrawl API...');
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    console.log('Attempting to scrape StreetEasy...');
    const result = await app.scrape('https://streeteasy.com/for-rent/nyc', {
      formats: ['markdown']
    });
    
    console.log('Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
