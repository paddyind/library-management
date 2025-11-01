#!/usr/bin/env node
/**
 * Supabase Connection Diagnostic Tool
 * 
 * This script helps diagnose Supabase connectivity issues
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Supabase Connection Diagnostic\n');
console.log('=' .repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('\n❌ Missing required environment variables!');
  console.log('   Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Test DNS resolution
console.log('\n🌐 DNS Resolution Test:');
const hostname = new URL(SUPABASE_URL).hostname;
console.log(`  Hostname: ${hostname}`);

// Test basic connectivity
console.log('\n🔌 Connectivity Tests:');

// Test 1: Basic HTTPS connection
async function testBasicConnection() {
  return new Promise((resolve) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      console.log(`  ✅ HTTPS Connection: Status ${res.statusCode}`);
      resolve({ success: true, status: res.statusCode });
    });

    req.on('error', (error) => {
      console.log(`  ❌ HTTPS Connection Failed: ${error.message}`);
      if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND') {
        console.log('     → DNS resolution failed');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        console.log('     → Connection timeout (possibly blocked by firewall/proxy)');
      }
      resolve({ success: false, error: error.message, code: error.code });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`  ❌ HTTPS Connection: Timeout after 10 seconds`);
      resolve({ success: false, error: 'Timeout' });
    });

    req.setTimeout(10000);
    req.end();
  });
}

// Test 2: Fetch API (using Node.js fetch if available, otherwise fallback)
async function testFetchAPI() {
  try {
    // Use dynamic import for fetch (Node 18+)
    let fetch;
    try {
      fetch = (await import('node-fetch')).default;
    } catch {
      // Node 18+ has native fetch
      if (typeof globalThis.fetch === 'function') {
        fetch = globalThis.fetch;
      } else {
        throw new Error('fetch not available');
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`  ✅ Fetch API: Status ${response.status}`);
      return { success: true, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log(`  ❌ Fetch API: Timeout after 10 seconds`);
        return { success: false, error: 'Timeout' };
      }
      throw error;
    }
  } catch (error) {
    console.log(`  ⚠️  Fetch API: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run tests
(async () => {
  const basicResult = await testBasicConnection();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const fetchResult = await testFetchAPI();

  console.log('\n📊 Diagnostic Summary:');
  console.log('=' .repeat(50));

  if (basicResult.success && fetchResult.success) {
    console.log('\n✅ All tests passed! Supabase is reachable.');
    console.log('   The issue might be with:');
    console.log('   - Database tables not created');
    console.log('   - Row Level Security (RLS) policies blocking access');
    console.log('   - Network instability during health check');
    console.log('\n💡 Recommendations:');
    console.log('   1. Run seed script: docker compose exec backend npm run seed');
    console.log('   2. Check Supabase dashboard: https://supabase.com/dashboard');
    console.log('   3. Verify project is not paused (free tier pauses after inactivity)');
  } else if (basicResult.success || fetchResult.success) {
    console.log('\n⚠️  Partial connectivity detected');
    console.log('   One test passed, but another failed. This suggests:');
    console.log('   - Network instability');
    console.log('   - Proxy/firewall blocking some connections');
    console.log('\n💡 Recommendations:');
    console.log('   1. Check HTTP_PROXY and HTTPS_PROXY environment variables');
    console.log('   2. Verify firewall rules allow HTTPS to *.supabase.co');
    console.log('   3. Try increasing timeout in supabase.service.ts');
  } else {
    console.log('\n❌ Connection tests failed');
    console.log('   Supabase is not reachable from this network.');
    console.log('\n💡 Possible Solutions:');
    console.log('   1. Corporate Proxy:');
    console.log('      - Set HTTP_PROXY and HTTPS_PROXY in .env file');
    console.log('      - Example: HTTP_PROXY=http://proxy.company.com:8080');
    console.log('   2. Firewall:');
    console.log('      - Allow HTTPS traffic to *.supabase.co');
    console.log('      - Port 443 must be open');
    console.log('   3. DNS Issues:');
    console.log('      - Check DNS settings in docker-compose.yml');
    console.log('      - Verify DNS can resolve *.supabase.co');
    console.log('   4. Use SQLite Instead:');
    console.log('      - Set AUTH_STORAGE=sqlite in .env');
    console.log('      - Restart: docker compose restart backend');
    console.log('   5. Check Supabase Project:');
    console.log('      - Visit: https://supabase.com/dashboard');
    console.log('      - Verify project is active (not paused)');
    console.log('      - Check project settings');
  }

  console.log('\n' + '='.repeat(50));
  process.exit(0);
})();

