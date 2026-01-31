const FirecrawlApp = require('@mendable/firecrawl-js').default;

async function test() {
  try {
    console.log('Testing if your API key works with v2...\n');
    const app = new FirecrawlApp({ apiKey: 'fc-66a14c94a9b44b498551fb0d201dd037' });
    
    const result = await app.scrape('https://example.com', {
      formats: ['markdown']
    });
    
    console.log('✓ Your API key works with the latest SDK!');
    console.log('Result:', result);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.log('\nYour API key might be v1 only.');
    console.log('\nTo get a v2 key:');
    console.log('1. Go to https://firecrawl.dev');
    console.log('2. Log in with your account');
    console.log('3. Go to Settings > API Keys');
    console.log('4. Click "Create New API Key"');
    console.log('5. Copy the new key (starts with fc-...)');
    console.log('6. Update your .env file');
  }
}

test();
