const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8085';

async function testEndpoints () {
  console.log('Testing Med Connecter API endpoints...\n');

  const endpoints = [
    '/medconnecter',
    '/medconnecter/health',
    '/medconnecter/api-docs-debug',
    '/medconnecter/api-docs',
    '/medconnecter/api-docs.json'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status code
      });

      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);

      if (response.status === 200) {
        if (response.headers['content-type']?.includes('application/json')) {
          console.log(`  Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
        } else {
          console.log(`  Response: HTML content (${response.data.length} characters)`);
        }
      } else {
        console.log(`  Error: ${response.data?.message || 'No error message'}`);
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

// Run the test
testEndpoints().catch(console.error);
