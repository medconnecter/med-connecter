#!/usr/bin/env node

/**
 * Test script to verify all endpoints are working correctly at the medconnecter context path
 * Run this script after deployment to ensure everything is working
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8085';
const CONTEXT_PATH = '/medconnecter';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'MedConnecter-Test-Script',
        'Accept': 'application/json',
        ...headers
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpoint(path, method = 'GET', expectedStatus = 200, description = '') {
  const url = `${BASE_URL}${CONTEXT_PATH}${path}`;
  const testName = description || `${method} ${path}`;
  
  try {
    log(`Testing: ${testName}`, 'blue');
    const response = await makeRequest(url, method);
    
    if (response.statusCode === expectedStatus) {
      log(`✅ PASS: ${testName} (${response.statusCode})`, 'green');
      return true;
    } else {
      log(`❌ FAIL: ${testName} - Expected ${expectedStatus}, got ${response.statusCode}`, 'red');
      if (response.data && typeof response.data === 'object') {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      return false;
    }
  } catch (error) {
    log(`❌ ERROR: ${testName} - ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('🚀 Starting MedConnecter Endpoint Tests', 'blue');
  log(`Base URL: ${BASE_URL}`, 'yellow');
  log(`Context Path: ${CONTEXT_PATH}`, 'yellow');
  log('');

  const tests = [
    // Basic endpoints
    { path: '/', description: 'Root endpoint' },
    { path: '/health', description: 'Health check' },
    
    // API Documentation
    { path: '/api-docs', description: 'Swagger UI' },
    { path: '/api-docs.json', description: 'Swagger JSON' },
    { path: '/api-docs-debug', description: 'API docs debug' },
    
    // API v1 endpoints (should return 401 for unauthorized access, which is expected)
    { path: '/api/v1/auth/register', method: 'POST', expectedStatus: 400, description: 'Auth register endpoint' },
    { path: '/api/v1/auth/login', method: 'POST', expectedStatus: 400, description: 'Auth login endpoint' },
    { path: '/api/v1/users/profile', expectedStatus: 401, description: 'User profile endpoint' },
    { path: '/api/v1/doctors', description: 'Doctors list endpoint' },
    { path: '/api/v1/appointments', expectedStatus: 401, description: 'Appointments endpoint' },
    { path: '/api/v1/reviews', description: 'Reviews endpoint' },
    { path: '/api/v1/notifications', expectedStatus: 401, description: 'Notifications endpoint' },
    { path: '/api/v1/payments/create-intent', method: 'POST', expectedStatus: 401, description: 'Payments endpoint' },
    { path: '/api/v1/chats', expectedStatus: 401, description: 'Chats endpoint' },
    { path: '/api/v1/video', expectedStatus: 401, description: 'Video endpoint' },
    { path: '/api/v1/admin/users', expectedStatus: 401, description: 'Admin users endpoint' },
    
    // Recommendations endpoint (public)
    { path: '/api/v1/recommendations/common-symptoms', description: 'Common symptoms endpoint' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testEndpoint(
      test.path, 
      test.method || 'GET', 
      test.expectedStatus || 200, 
      test.description
    );
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  log('', 'blue');
  log('📊 Test Results Summary:', 'blue');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`, 'yellow');
  
  if (failed === 0) {
    log('🎉 All tests passed! Your MedConnecter API is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Please check the deployment and configuration.', 'yellow');
  }

  log('', 'blue');
  log('🔗 Available Endpoints:', 'blue');
  log(`   📖 API Documentation: ${BASE_URL}${CONTEXT_PATH}/api-docs`, 'yellow');
  log(`   ❤️  Health Check: ${BASE_URL}${CONTEXT_PATH}/health`, 'yellow');
  log(`   🏠 Root: ${BASE_URL}${CONTEXT_PATH}/`, 'yellow');
  log(`   🔧 API Base: ${BASE_URL}${CONTEXT_PATH}/api/v1`, 'yellow');
}

// Run the tests
runTests().catch(error => {
  log(`💥 Test script failed: ${error.message}`, 'red');
  process.exit(1);
});
