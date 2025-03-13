/**
 * Reddit Account Limits Test Script
 * 
 * This script tests the implementation of Reddit account limits based on subscription tiers.
 * It validates both the frontend checks and the database constraints.
 * 
 * To run this test:
 * 1. Make sure you have the required environment variables set
 * 2. npm run test:account-limits
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SubscriptionTier, isWithinUsageLimit } from '../src/lib/subscription/features.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users with different subscription tiers
interface TestUser {
  id: string;
  email: string;
  tier: SubscriptionTier;
  accountsToCreate: number;
  expectedResult: boolean;
}

// Define subscription data interface for type safety
interface SubscriptionData {
  user_id: string;
  stripe_price_id: string;
  stripe_products: {
    name: string;
  }
}

// Mock test data - these would need to be updated with actual test users in your environment
const testUsers: TestUser[] = [
  {
    id: 'free-user-id',
    email: 'test-free@example.com',
    tier: 'free',
    accountsToCreate: 2, // This should fail (limit = 1)
    expectedResult: false,
  },
  {
    id: 'starter-user-id',
    email: 'test-starter@example.com',
    tier: 'starter',
    accountsToCreate: 3, // This should succeed (limit = 3)
    expectedResult: true,
  },
  {
    id: 'creator-user-id',
    email: 'test-creator@example.com',
    tier: 'creator',
    accountsToCreate: 10, // This should succeed (limit = 10)
    expectedResult: true,
  },
  {
    id: 'creator-over-user-id',
    email: 'test-creator-over@example.com',
    tier: 'creator',
    accountsToCreate: 11, // This should fail (limit = 10)
    expectedResult: false,
  },
];

// Test the frontend limit check function
async function testFrontendLimits() {
  console.log('\n--- Testing Frontend Limit Checks ---');
  
  // Test each subscription tier with different account counts
  const tiers: SubscriptionTier[] = ['free', 'starter', 'creator', 'pro', 'agency', 'admin', 'gift'];
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

// Test real user accounts against their subscription tiers
async function testRealUserAccounts() {
  console.log('\n--- Testing Real User Accounts Against Subscription Tiers ---');
  
  // Get active subscriptions with account counts
  const { data: subscriptions, error } = await supabase
    .from('customer_subscriptions')
    .select(`
      user_id,
      stripe_price_id,
      stripe_products:stripe_products(name)
    `)
    .eq('status', 'active')
    .limit(10);
  
  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }
  
  for (const sub of (subscriptions || []) as unknown as SubscriptionData[]) {
    // Get account count for this user
    const { data: accounts, error: accountsError } = await supabase
      .from('reddit_accounts')
      .select('id', { count: 'exact' })
      .eq('user_id', sub.user_id);
    
    if (accountsError) {
      console.error(`Error fetching accounts for user ${sub.user_id}:`, accountsError);
      continue;
    }
    
    const accountCount = accounts?.length || 0;
    // Properly type and access the product name
    const productName = sub.stripe_products.name || 'free';
    const tier = productName.toLowerCase() as SubscriptionTier;
    const withinLimit = isWithinUsageLimit(tier, 'reddit_accounts', accountCount);
    
    console.log(`User ${sub.user_id.substring(0, 8)}... | Tier: ${tier} | Accounts: ${accountCount} | Within limit: ${withinLimit ? 'YES ✅' : 'NO ❌'}`);
  }
}

// Main function to run all tests
async function runTests() {
  console.log('🧪 STARTING REDDIT ACCOUNT LIMITS TESTS 🧪');
  
  try {
    // Test the frontend limit check function
    await testFrontendLimits();
    
    // Test database triggers
    await testDatabaseTriggers();
    
    // Test real user accounts
    await testRealUserAccounts();
    
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();

// Export a function to run this from a package.json script
export default runTests; 