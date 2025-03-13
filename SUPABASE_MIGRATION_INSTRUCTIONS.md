# Instructions for Applying Supabase Migrations

This document provides instructions for applying the Row Level Security (RLS) policies to fix access control issues with the customer subscriptions and profiles tables.

## Background

The application is currently experiencing access control errors in test mode, specifically:

1. Error fetching profile data:
   ```
   [Error] Error fetching profile: – {message: "TypeError: Load failed", details: "", hint: "", …}
   ```

2. Error accessing customer subscriptions due to access control checks:
   ```
   [Error] Fetch API cannot load https://pdgnyhkngewmneujsheq.supabase.co/rest/v1/customer_subscriptions?select=*&user_id=eq.310aa3e8-8f07-4d77-bf3b-23831336061e due to access control checks.
   ```

These errors occur because the necessary Row Level Security (RLS) policies are not properly configured for these tables.

## Solution: Apply RLS Migration

The `20250227000000_fix_customer_subscriptions_rls.sql` migration file has been created to add the necessary RLS policies. This migration will:

1. Enable RLS on the `customer_subscriptions` table
2. Create policies allowing users to view, insert, update, and delete their own subscription data
3. Enable RLS on the `profiles` table
4. Create policies allowing users to view and update their own profile data
5. Add service role policies to allow background processes and webhooks to access the data
6. Enable RLS on `stripe_prices` and `stripe_products` tables with appropriate policies

## How to Apply the Migration

### Option 1: Via Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.io/)
2. Select your project
3. Go to the SQL Editor
4. Copy the contents of the `supabase/migrations/20250227000000_fix_customer_subscriptions_rls.sql` file
5. Paste into the SQL Editor and run the query
6. Verify that the migration completed successfully

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

1. Make sure you're logged in to the Supabase CLI:
   ```bash
   supabase login
   ```

2. Link your local project to your Supabase project (if not already linked):
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. Push the migration:
   ```bash
   supabase db push
   ```

## Verification

After applying the migration, you should verify that the RLS policies are working correctly:

1. Log in to your application
2. Verify that you can access your profile data
3. Verify that you can access your subscription data
4. Check the console for any remaining access control errors

If you encounter any issues, check the Supabase logs for error messages.

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Troubleshooting RLS Issues](https://supabase.com/docs/guides/auth/row-level-security#troubleshooting-rls-issues) 