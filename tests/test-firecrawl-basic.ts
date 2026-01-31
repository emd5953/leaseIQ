import FirecrawlApp from '@mendable/firecrawl-js';

async function test() {
  try {
    console.log('Testing Firecrawl API with example.com...');
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    const result = await app.scrape('https://example.com', {
      formats: ['markdown']
    });
    
    console.log('✓ API key is valid!');
    console.log('Result:', result);
  } catch (error: any) {
    console.error('✗ Error:', error.message || error);
  }
}

test();
