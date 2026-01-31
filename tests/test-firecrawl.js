const https = require('https');

const data = JSON.stringify({
  url: 'https://streeteasy.com/for-rent/nyc',
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

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
