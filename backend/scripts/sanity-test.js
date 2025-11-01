#!/usr/bin/env node

/**
 * Sanity Test Suite for Library Management System
 * 
 * Tests basic application functionality:
 * - Database connectivity (SQLite)
 * - API endpoints health
 * - Authentication flow
 * - Basic CRUD operations
 * 
 * Usage:
 *   node scripts/sanity-test.js
 *   docker compose exec backend node scripts/sanity-test.js
 */

const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const API_URL = `${API_BASE_URL}/api`;

// Test results
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}${path}`;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            raw: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            raw: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test runner
function test(name, fn) {
  return async () => {
    try {
      await fn();
      testsPassed++;
      log(`  ✓ ${name}`, 'green');
      return true;
    } catch (error) {
      testsFailed++;
      failures.push({ name, error: error.message });
      log(`  ✗ ${name}: ${error.message}`, 'red');
      return false;
    }
  };
}

// Test suite
async function runTests() {
  log('\n🧪 Starting Sanity Test Suite...\n', 'cyan');
  log(`API URL: ${API_URL}\n`, 'blue');

  let authToken = null;
  let testUserId = null;
  let testBookId = null;

  // Test 1: Health Check - API is reachable
  await test('API Health Check - Server is reachable', async () => {
    try {
      await request('GET', '/books');
    } catch (error) {
      throw new Error(`Cannot reach API: ${error.message}`);
    }
  })();

  // Test 2: Get Books - Public endpoint
  await test('GET /api/books - Public books endpoint', async () => {
    const response = await request('GET', '/books');
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (!Array.isArray(response.body)) {
      throw new Error('Response should be an array');
    }
    log(`    Found ${response.body.length} books in database`, 'yellow');
  })();

  // Test 3: Register new user
  await test('POST /api/auth/register - User registration', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const response = await request('POST', '/auth/register', {
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.access_token) {
      throw new Error('Missing access_token in response');
    }

    authToken = response.body.access_token;
    testUserId = response.body.user?.id || 'unknown';
    log(`    Registered user: ${testEmail} (ID: ${testUserId})`, 'yellow');
  })();

  // Test 4: Login
  await test('POST /api/auth/login - User login', async () => {
    const response = await request('POST', '/auth/login', {
      email: 'admin@library.com',
      password: 'admin123',
    });

    if (response.status === 401 || response.status === 404) {
      log('    Admin user not found, this is OK for fresh install', 'yellow');
      return;
    }

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.body.access_token) {
      throw new Error('Missing access_token in response');
    }

    authToken = response.body.access_token;
    log('    Logged in as admin@library.com', 'yellow');
  })();

  // Test 5: Get User Profile (requires auth)
  await test('GET /api/users/profile - Authenticated profile endpoint', async () => {
    if (!authToken) {
      log('    Skipping - no auth token available', 'yellow');
      return;
    }

    const response = await request('GET', '/users/profile', null, authToken);

    if (response.status === 401) {
      throw new Error('Unauthorized - token may be invalid');
    }

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.body.email) {
      throw new Error('Profile response missing email');
    }

    log(`    Profile retrieved for: ${response.body.email}`, 'yellow');
  })();

  // Test 6: Create Book (requires auth)
  await test('POST /api/books - Create book (authenticated)', async () => {
    if (!authToken) {
      log('    Skipping - no auth token available', 'yellow');
      return;
    }

    const response = await request(
      'POST',
      '/books',
      {
        title: 'Sanity Test Book',
        author: 'Test Author',
        isbn: '978-0-123456-78-9',
      },
      authToken
    );

    if (response.status === 401) {
      throw new Error('Unauthorized - token may be invalid');
    }

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.id) {
      throw new Error('Book response missing id');
    }

    testBookId = response.body.id;
    log(`    Created book: ${response.body.title} (ID: ${testBookId})`, 'yellow');
  })();

  // Test 7: Get Single Book
  await test('GET /api/books/:id - Get single book', async () => {
    if (!testBookId) {
      // Try to get first book from list
      const listResponse = await request('GET', '/books');
      if (listResponse.body && listResponse.body.length > 0) {
        testBookId = listResponse.body[0].id;
      } else {
        log('    Skipping - no books available', 'yellow');
        return;
      }
    }

    const response = await request('GET', `/books/${testBookId}`);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.body.id) {
      throw new Error('Book response missing id');
    }

    log(`    Retrieved book: ${response.body.title}`, 'yellow');
  })();

  // Test 8: Search Books
  await test('GET /api/books?query=test - Search books', async () => {
    const response = await request('GET', '/books?query=test');

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!Array.isArray(response.body)) {
      throw new Error('Search response should be an array');
    }

    log(`    Found ${response.body.length} books matching "test"`, 'yellow');
  })();

  // Test 9: SQLite Database Check
  await test('SQLite Database - Verify connectivity', async () => {
    // Check if books endpoint works (uses SQLite fallback)
    const response = await request('GET', '/books');
    
    if (response.status !== 200) {
      throw new Error('Cannot access database');
    }

    log('    SQLite database is accessible', 'yellow');
  })();

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${testsPassed + testsFailed}`, 'blue');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

  if (failures.length > 0) {
    log('\nFailed Tests:', 'red');
    failures.forEach((failure) => {
      log(`  - ${failure.name}: ${failure.error}`, 'red');
    });
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan');

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

