// Test the deployed backend API
const API_URL = 'https://leaseiq.onrender.com';

async function testDeployedBackend() {
  console.log('Testing Deployed Backend API\n');
  console.log('='.repeat(50));
  
  // Test 1: Health Check
  console.log('\n1. Testing Health Endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Health check passed:`, data);
    } else {
      console.log(`   ✗ Health check failed`);
    }
  } catch (error: any) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Test 2: Search Endpoint
  console.log('\n2. Testing Search Endpoint...');
  try {
    const response = await fetch(`${API_URL}/api/search?limit=3`);
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Found ${data.total} total listings`);
      console.log(`   ✓ Returned ${data.listings?.length || 0} listings`);
      if (data.listings?.[0]) {
        console.log(`   First listing: ${data.listings[0]._id} - ${data.listings[0].title}`);
      }
    } else {
      const text = await response.text();
      console.log(`   ✗ Search failed: ${text}`);
    }
  } catch (error: any) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Test 3: Specific Listing
  console.log('\n3. Testing Listing Detail Endpoint...');
  const testId = '697ff81a0e89d326d15befc8'; // Known good ID from local DB
  try {
    const response = await fetch(`${API_URL}/api/search/${testId}`);
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Listing found: ${data.title}`);
      console.log(`   Address: ${data.address}`);
      console.log(`   Price: $${data.price}`);
    } else {
      const text = await response.text();
      console.log(`   ✗ Listing not found: ${text}`);
    }
  } catch (error: any) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Test 4: CORS Check
  console.log('\n4. Testing CORS Headers...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log(`   CORS Header: ${corsHeader || 'Not set'}`);
  } catch (error: any) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\nDiagnosis:');
  console.log('If all tests pass, the backend is working fine.');
  console.log('If health check fails, the backend service is down.');
  console.log('If search fails, there might be a database connection issue.');
  console.log('If listing detail fails, the ID might not exist in production DB.');
}

testDeployedBackend();
