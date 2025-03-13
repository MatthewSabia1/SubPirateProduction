# Reddit Account Limits - Database Migrations

This directory contains SQL migrations to update the database schema to support Reddit account limits for different subscription tiers.

## Overview of Migrations

1. `01_add_reddit_accounts_feature.sql`: Adds the 'reddit_accounts' feature to the subscription_features table.
2. `02_map_reddit_accounts_to_products.sql`: Maps the 'reddit_accounts' feature to each subscription tier.
3. `03_add_reddit_accounts_count_column.sql`: Adds a tracking column in the user_usage_stats table.
4. `04_create_trigger_for_reddit_accounts.sql`: Creates triggers to automatically update the reddit_accounts_count when accounts are added or removed.

## How to Run These Migrations

1. Log in to the Supabase dashboard.
2. Go to the SQL Editor.
3. Create a new query.
4. Copy and paste the contents of each migration file in order (01, 02, 03, 04).
5. Run each migration and verify the output.

### Important Notes

- Run the migrations in order, as later migrations depend on changes made by earlier ones.
- Each migration includes verification queries at the end to ensure the changes were applied correctly.
- If any migration fails, check the error message and resolve the issue before proceeding to the next one.
- After running all migrations, you can verify that the database schema is updated correctly by checking:
  - The subscription_features table has a 'reddit_accounts' feature
  - The product_features table maps this feature to each subscription tier
  - The user_usage_stats table has a reddit_accounts_count column
  - The triggers are created to automatically update the reddit_accounts_count

## Additional Verification

After running all migrations, you can verify the complete setup with this query:

```sql
SELECT 
  sp.name AS product_name,
  sf.name AS feature_name,
  sf.description,
  pf.enabled
FROM product_features pf
JOIN stripe_products sp ON pf.stripe_product_id = sp.stripe_product_id
JOIN subscription_features sf ON pf.feature_key = sf.feature_key
WHERE sf.feature_key = 'reddit_accounts';
```

This should show the 'Reddit Accounts' feature enabled for all subscription tiers. 