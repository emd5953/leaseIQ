const https = require('https');

const data = JSON.stringify({
  url: 'https://www.zillow.com/homes/for_rent/',
  formats: ['extract'],
  extract: {
    schema: {
      type: 'object',
      properties: {
        listings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              price: { type: 'number' }
            }
          }
        }
      }
    }
  }
});

const options = {
  hostname: 'api.firecrawl.dev',
  port: 443,
  path: '/v1/scrape',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fc-66a14c94a9b44b498551fb0d201dd037',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing extraction with your API key...\n');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✓ Extraction works!');
      const result = JSON.parse(body);
      console.log('Extract data:', result.extract);
    } else if (res.statusCode === 402) {
      console.log('✗ Payment required - you need a paid plan for extraction');
    } else if (res.statusCode === 403) {
      console.log('✗ Forbidden - extraction not enabled on your plan');
    } else {
      console.log('Response:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
