# Stripe-Supabase Sync Script

This script synchronizes your Stripe test products and prices to your Supabase database.

## Products to Sync

- Starter: prod_RpekF2EAu1npzb (price_1QvzQXCtsTY6FiiZniXOiFkM)
- Creator: prod_RpekhttqS8GKpE (price_1QvzQlCtsTY6FiiZdZlSfPJc)
- Pro: prod_RpekrPRCVGOqJM (price_1QvzQyCtsTY6FiiZD1DOaPJi)
- Agency: prod_Rpek1uw0yBJmLG (price_1QvzRBCtsTY6FiiZEtKt3SYA)

## Usage Instructions

1. Install dependencies:
   ```bash
   npm install --save dotenv @supabase/supabase-js stripe
   ```

2. Make sure your `.env` file contains the following variables:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```

3. Run the script:
   ```bash
   node sync-stripe-products.js
   ```

4. Check the console output to verify all products and prices were synced successfully.

## What This Script Does

1. Retrieves each product from Stripe
2. Upserts the product into the `stripe_products` table in Supabase
3. Retrieves all prices for each product
4. Upserts each price into the `stripe_prices` table in Supabase

This ensures your Supabase database contains all the necessary product and price information for your Stripe checkout flow. 