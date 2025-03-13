# Stripe Synchronization Guide

This document outlines how Stripe product and pricing data synchronizes with the Supabase database in SubPirate.

## Overview

SubPirate uses a dual approach to ensure Stripe data remains in sync with the database:

1. **Webhooks**: Real-time updates when changes occur in Stripe
2. **Scheduled Sync**: A backup mechanism that runs periodically to catch any missed events

This ensures that your pricing tables always display the latest product information and pricing from Stripe.

## Webhook System

### How It Works

The webhook system listens for specific events from Stripe and immediately updates the Supabase database:

- When products are created, updated, or deleted in Stripe
- When prices are created, updated, or deleted in Stripe
- When subscriptions change status
- When checkout sessions complete

### Events Handled

| Event Type | Action |
|------------|--------|
| `product.created` | Adds new product to database |
| `product.updated` | Updates existing product in database |
| `product.deleted` | Marks product as inactive in database |
| `price.created` | Adds new price to database |
| `price.updated` | Updates existing price in database |
| `price.deleted` | Marks price as inactive in database |

### Webhook Setup

To ensure the webhook is properly configured:

1. **Register the webhook** using the provided script:

   ```bash
   # Set the webhook URL environment variable first
   export STRIPE_WEBHOOK_URL=https://your-domain.com/api/stripe/webhook
   
   # Run the registration script
   ts-node scripts/register-stripe-webhook.ts
   ```

2. **Store the webhook secret** in your environment variables:

   ```
   VITE_STRIPE_WEBHOOK_SECRET=whsec_123...
   ```

   - For production: Add to your hosting environment (e.g., Vercel, Netlify)
   - For development: Add to your `.env` file

3. **Verify webhook functionality** by making a test change in Stripe and checking your database

## Scheduled Synchronization

As a backup to webhooks, a scheduled synchronization script runs periodically to ensure database consistency.

### How to Run the Sync Script

```bash
# Manual execution
ts-node scripts/scheduled-stripe-sync.ts

# Set up as a cron job (recommended)
# This example runs daily at midnight
0 0 * * * cd /path/to/app && ts-node scripts/scheduled-stripe-sync.ts >> /var/log/stripe-sync.log 2>&1
```

### What the Sync Script Does

1. Fetches all active products and prices from Stripe
2. Compares with existing database records
3. Adds missing products and prices
4. Updates modified products and prices
5. Marks inactive products and prices

## Troubleshooting

### Webhook Issues

- **Events not being received**: Check your Stripe Dashboard → Developers → Webhooks → [Your Webhook] → Logs
- **Signature verification failed**: Ensure you're using the correct webhook secret
- **Error in event handling**: Check your application logs

### Sync Script Issues

- **Authentication errors**: Verify your Stripe API key is correct
- **Database errors**: Check Supabase permissions and schema
- **Sync failures**: Examine the output logs for specific error messages

### Manual Data Reconciliation

If necessary, you can manually force a complete data sync:

```bash
ts-node scripts/scheduled-stripe-sync.ts
```

## Database Schema

The Stripe data is stored in the following tables:

### stripe_products

| Column | Description |
|--------|-------------|
| stripe_product_id | Stripe's product ID (e.g., prod_XYZ123) |
| name | Product name |
| description | Product description |
| active | Whether the product is active |
| metadata | Additional product metadata |
| created_at | Timestamp when record was created |
| updated_at | Timestamp when record was last updated |

### stripe_prices

| Column | Description |
|--------|-------------|
| id | Stripe's price ID (e.g., price_XYZ123) |
| stripe_product_id | Associated Stripe product ID |
| unit_amount | Price in cents |
| currency | Currency code (e.g., usd) |
| recurring_interval | For recurring prices: month, year, etc. |
| type | Price type (one_time or recurring) |
| active | Whether the price is active |
| created_at | Timestamp when record was created |
| updated_at | Timestamp when record was last updated |

## Frontend Implementation

The frontend components (`LandingPage.tsx` and `Pricing.tsx`) fetch this data from Supabase via utility functions in `src/lib/stripe/client.ts`:

- `getActiveProducts()` - Retrieves all active products
- `getActivePrices()` - Retrieves all active prices
- `getProductFeatures()` - Retrieves features for a specific product

These functions include fallback mechanisms to ensure the UI remains functional even if data cannot be retrieved.

## Best Practices

1. **Always use the Stripe Dashboard** for price and product changes to ensure proper synchronization
2. **Don't modify Stripe data directly** in the database, as it will be overwritten on the next sync
3. **Monitor webhook events** in the Stripe Dashboard to ensure they're being delivered
4. **Run the sync script periodically** as a backup (daily is recommended)
5. **Keep test and production environments separate** with different webhook endpoints 