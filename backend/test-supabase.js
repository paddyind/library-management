#!/usr/bin/env node
/**
 * Supabase Connection Test Script
 * Tests Supabase connection and creates demo users
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Read from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

console.log('🔧 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Demo users to create
const demoUsers = [
  {
    email: 'admin@library.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User'
  },
  {
    email: 'user@library.com',
    password: 'user123',
    role: 'member',
    name: 'Demo User'
  },
  {
    email: 'test@library.com',
    password: 'test123',
    role: 'member',
    name: 'Test User'
  }
];

async function testConnection() {
  console.log('\n📡 Testing Supabase connection...');
  
  try {
    // Test connection by attempting to get session
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
    
    console.log('✅ Successfully connected to Supabase!');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function createDemoUsers() {
  console.log('\n👥 Creating demo users...\n');
  
  const results = {
    success: [],
    failed: [],
    existing: []
  };

  for (const user of demoUsers) {
    try {
      console.log(`   Creating user: ${user.email}...`);
      
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            name: user.name,
            role: user.role
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log(`   ⚠️  User ${user.email} already exists`);
          results.existing.push(user.email);
        } else {
          throw error;
        }
      } else {
        console.log(`   ✅ Created: ${user.email} (${user.role})`);
        results.success.push(user.email);
      }
    } catch (error) {
      console.error(`   ❌ Failed to create ${user.email}:`, error.message);
      results.failed.push({ email: user.email, error: error.message });
    }
  }

  return results;
}

async function listUsers() {
  console.log('\n📋 Attempting to list users...');
  
  try {
    // Note: Listing users requires service_role key, not anon key
    // This will likely fail with anon key, which is expected
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('   ⚠️  Cannot list users with anon key (this is normal)');
      console.log('   💡 Use SUPABASE_SERVICE_ROLE_KEY to list all users');
      return;
    }
    
    console.log(`   ✅ Found ${data.users.length} users`);
    data.users.forEach(user => {
      console.log(`      - ${user.email} (${user.user_metadata?.role || 'no role'})`);
    });
  } catch (error) {
    console.log('   ⚠️  Cannot list users:', error.message);
  }
}

async function testLogin() {
  console.log('\n🔐 Testing login with demo credentials...\n');
  
  const testUser = demoUsers[0]; // Test with admin user
  
  try {
    console.log(`   Attempting login: ${testUser.email}...`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      throw error;
    }

    console.log('   ✅ Login successful!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Token:', data.session.access_token.substring(0, 30) + '...');
    
    // Sign out
    await supabase.auth.signOut();
    console.log('   ✅ Sign out successful');
    
    return true;
  } catch (error) {
    console.error('   ❌ Login failed:', error.message);
    return false;
  }
}

async function displaySummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Successfully created: ${results.success.length} users`);
  if (results.success.length > 0) {
    results.success.forEach(email => console.log(`   - ${email}`));
  }
  
  console.log(`\n⚠️  Already existing: ${results.existing.length} users`);
  if (results.existing.length > 0) {
    results.existing.forEach(email => console.log(`   - ${email}`));
  }
  
  console.log(`\n❌ Failed: ${results.failed.length} users`);
  if (results.failed.length > 0) {
    results.failed.forEach(item => console.log(`   - ${item.email}: ${item.error}`));
  }
  
  console.log('\n📝 Demo Credentials:');
  demoUsers.forEach(user => {
    console.log(`   ${user.role === 'admin' ? '👑' : '👤'} ${user.email} / ${user.password}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SUPABASE CONNECTION TEST');
  console.log('='.repeat(60));
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Cannot proceed without a valid connection');
    process.exit(1);
  }
  
  // Create demo users
  const results = await createDemoUsers();
  
  // Test login
  await testLogin();
  
  // Try to list users (will likely fail with anon key)
  await listUsers();
  
  // Display summary
  await displaySummary(results);
  
  console.log('\n✨ Test completed!\n');
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
