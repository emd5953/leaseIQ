const https = require('https');

const data = JSON.stringify({
  url: 'https://example.com',
  formats: ['extract'],
  extract: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' }
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
  },
  timeout: 15000
};

console.log('Testing extraction...\n');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
    
    if (res.statusCode === 200) {
      console.log('\n✓ EXTRACTION WORKS! You can use it.');
    } else if (res.statusCode === 402) {
      console.log('\n✗ You need to upgrade to a paid plan');
    } else if (res.statusCode === 403) {
      console.log('\n✗ Extraction not enabled');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.on('timeout', () => {
  console.log('Request timed out');
  req.destroy();
});

req.write(data);
req.end();
