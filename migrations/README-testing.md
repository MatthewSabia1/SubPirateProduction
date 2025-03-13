# Testing Reddit Account Limits Implementation

This document provides instructions for testing the Reddit account limits feature, which enforces different limits on the number of Reddit accounts a user can connect based on their subscription tier.

## Testing Overview

There are two main ways to test the implementation:

1. **Database Tests**: SQL scripts that validate database schema changes, triggers, and data integrity
2. **Application Tests**: TypeScript tests that validate the frontend limit checks and API interactions

## Testing the Reddit Account Limits Feature

### Database Tests

To run the database tests, you need to execute the SQL test script against your Supabase database:

```bash
# Using psql directly with your database credentials
psql -h <host> -U <username> -d <database> -f migrations/test_account_limits.sql
```

This script will:
1. Verify the `reddit_accounts` feature exists in the `subscription_features` table
2. Check that the feature is mapped to all subscription tiers
3. Confirm the `reddit_accounts_count` column exists in the `user_usage_stats` table
4. Verify the trigger function and triggers exist
5. Test the trigger functionality with mock accounts
6. Analyze real user accounts against their subscription tiers

### Application Tests

To run the application tests:

```bash
npm run test:account-limits
```

This will test:
1. The frontend limit checking function `isWithinUsageLimit`
2. Validate that the limits are correctly enforced for each subscription tier

## Manual Testing Steps

For a comprehensive validation, follow these manual testing steps:

1. **Test Adding Accounts**:
   - Log in as a user with a 'free' subscription
   - Attempt to add a second Reddit account (should be prevented)
   - Upgrade to 'starter' tier
   - Verify that you can now add up to 3 accounts
   - Try adding a 4th account (should be prevented)

2. **Test UI Feedback**:
   - Verify that the Reddit Connect Modal shows the correct account limit
   - Check that the modal indicates how many more accounts can be added
   - Confirm that the "Connect Account" button is disabled when the limit is reached
   - Ensure error messages are displayed when attempting to exceed limits

3. **Test Account Deletion**:
   - Delete an account when at the account limit
   - Verify that you can now add another account
   - Check that the displayed limits are updated correctly

## Expected Tier Limits

The account limits for each subscription tier are:

- Free: 1 account
- Starter: 3 accounts
- Creator: 10 accounts
- Pro: 25 accounts
- Agency: 100 accounts
- Admin/Gift: Unlimited accounts

## Troubleshooting

If the tests fail, check the following:

1. Ensure all database migrations have been run in order
2. Verify that the USAGE_LIMITS object in features.ts includes reddit_accounts limits
3. Check that the RedditConnectModal and RedditAccounts components are correctly checking limits
4. Ensure the feature key 'reddit_accounts' is consistent across all implementations 