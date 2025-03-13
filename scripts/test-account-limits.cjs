/**
 * Reddit Account Limits Test Script (JavaScript version)
 * 
 * This is a simplified JavaScript version of the test script for compatibility.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simplified version of the features.ts isWithinUsageLimit function
function isWithinUsageLimit(tier, metric, currentUsage) {
  const limits = {
    free: { reddit_accounts: 1 },
    starter: { reddit_accounts: 3 },
    creator: { reddit_accounts: 10 },
    pro: { reddit_accounts: 25 },
    agency: { reddit_accounts: 100 },
    admin: { reddit_accounts: Infinity },
    gift: { reddit_accounts: Infinity }
  };
  
  const limit = limits[tier]?.[metric];
  
  // If limit is undefined or Infinity, user can use the feature
  if (limit === undefined || limit === Infinity) {
    return true;
  }
  
  return currentUsage < limit;
}

// Test the frontend limit check function
async function testFrontendLimits() {
  console.log('\n--- Testing Frontend Limit Checks ---');
  
  // Test each subscription tier with different account counts
  const tiers = ['free', 'starter', 'creator', 'pro', 'agency', 'admin', 'gift'];
  const counts = [0, 1, 2, 3, 5, 10, 15, 25, 50, 100, 101];
  
  for (const tier of tiers) {
    console.log(`\nTesting tier: ${tier}`);
    for (const count of counts) {
      const withinLimit = isWithinUsageLimit(tier, 'reddit_accounts', count);
      console.log(`  Count ${count}: ${withinLimit ? 'WITHIN LIMIT ✅' : 'LIMIT EXCEEDED ❌'}`);
    }
  }
}

// Test the database trigger functionality
async function testDatabaseTriggers() {
  console.log('\n--- Testing Database Triggers ---');
  
  // Create a test user ID
  const testUserId = '11111111-1111-1111-1111-111111111111';
  
  // Clean up any existing test data
  await supabase
    .from('reddit_accounts')
    .delete()
    .eq('user_id', testUserId);
  
  await supabase
    .from('user_usage_stats')
    .delete()
    .eq('user_id', testUserId);
  
  console.log('Creating test accounts...');
  
  // Create first account
  const { data: account1, error: error1 } = await supabase
    .from('reddit_accounts')
    .insert({
      user_id: testUserId,
      username: 'test_account_1',
      refresh_token: 'fake_token_1',
    })
    .select();
  
  if (error1) {
    console.error('Error creating test account 1:', error1);
    return;
  }
  
  // Check count after first account
  const { data: stats1 } = await supabase
    .from('user_usage_stats')
    .select('reddit_accounts_count')
    .eq('user_id', testUserId)
    .single();
  
  console.log(`After adding 1 account, count = ${stats1?.reddit_accounts_count}`);
  
  // Create second account
  const { data: account2, error: error2 } = await supabase
    .from('reddit_accounts')
    .insert({
      user_id: testUserId,
      username: 'test_account_2',
      refresh_token: 'fake_token_2',
    })
    .select();
  
  if (error2) {
    console.error('Error creating test account 2:', error2);
    return;
  }
  
  // Check count after second account
  const { data: stats2 } = await supabase
    .from('user_usage_stats')
    .select('reddit_accounts_count')
    .eq('user_id', testUserId)
    .single();
  
  console.log(`After adding 2 accounts, count = ${stats2?.reddit_accounts_count}`);
  
  // Delete first account
  if (account1 && account1[0]) {
    await supabase
      .from('reddit_accounts')
      .delete()
      .eq('id', account1[0].id);
    
    // Check count after deletion
    const { data: stats3 } = await supabase
      .from('user_usage_stats')
      .select('reddit_accounts_count')
      .eq('user_id', testUserId)
      .single();
    
    console.log(`After deleting 1 account, count = ${stats3?.reddit_accounts_count}`);
  }
  
  // Clean up
  await supabase
    .from('reddit_accounts')
    .delete()
    .eq('user_id', testUserId);
  
  await supabase
    .from('user_usage_stats')
    .delete()
    .eq('user_id', testUserId);
  
  console.log('Test data cleaned up.');
}

// Main function to run all tests
async function runTests() {
  console.log('🧪 STARTING REDDIT ACCOUNT LIMITS TESTS 🧪');
  
  try {
    // Test the frontend limit check function
    await testFrontendLimits();
    
    // Test database triggers
    await testDatabaseTriggers();
    
    console.log('\n✅ Tests completed');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 