# Stripe Integration Guide for SubPirate

This document explains how the Stripe integration works in SubPirate, especially regarding product features and dynamic price updates.

## Overview

SubPirate uses Stripe for subscription management and integrates with the Stripe API to keep product, price, and feature data in sync between Stripe and the application database.

The integration involves several components:
- Webhook handlers to process Stripe events
- Database tables to store product and feature information
- Client-side components that display dynamic pricing information

## How Product Features Work

Product features in SubPirate are defined in the database and can be dynamically updated through Stripe. Here's how it works:

1. Features are stored in the `subscription_features` table
2. Features are mapped to products in the `product_features` table
3. Products and prices are stored in `stripe_products` and `stripe_prices` tables
4. When products are updated in Stripe, webhooks sync the changes to our database

### Using Stripe Metadata for Features

Product features are stored in Stripe product metadata with these conventions:

- `feature_[key]`: Boolean flag indicating if a feature is enabled (e.g., `feature_analyze_subreddit: true`)
- `feature_limit_[key]`: Numeric limit for a feature (e.g., `feature_limit_analyze_subreddit: 50`)

When a product is updated in Stripe, the webhook handler extracts these metadata fields and updates the database accordingly.

## Setup and Maintenance

### Initial Setup

1. **Database Setup**:
   - The initial database schema is created during migration
   - Initial features and products are seeded in `migrations/02_initial_features.sql`

2. **Register Webhooks**:
   ```bash
   npm run stripe:register-webhooks
   ```
   This creates webhook endpoints in Stripe for product and price events.

3. **Migrate Product Data to Stripe**:
   ```bash
   npm run stripe:migrate-products
   ```
   This syncs products, prices and features from the database to Stripe with proper metadata.

### Webhook Development

For local development with webhooks:

```bash
npm run dev:webhook
```

This runs the Stripe CLI listener and forwards events to your local webhook endpoint.

## Managing Product Features

### Adding New Features

1. Add a new feature to the `subscription_features` table:
   ```sql
   INSERT INTO subscription_features (feature_key, name, description)
   VALUES ('new_feature', 'New Feature', 'Description of the new feature');
   ```

2. Map the feature to products:
   ```sql
   INSERT INTO product_features (stripe_product_id, feature_key, enabled)
   VALUES ('prod_starter', 'new_feature', true);
   ```

3. Run the migration script to update Stripe:
   ```bash
   npm run stripe:migrate-products
   ```

### Updating Features via Stripe Dashboard

1. Go to the Stripe Dashboard > Products
2. Select a product and click "Edit"
3. In the "Metadata" section, add or update:
   - Key: `feature_[feature_key]`, Value: `true` or `false`
   - Key: `feature_limit_[feature_key]`, Value: `[number]`
4. Save changes - the webhook will automatically update the database

## Troubleshooting

### Webhook Issues

If webhooks aren't processing:

1. Check the webhook logs in Stripe Dashboard > Developers > Webhooks
2. Verify your webhook endpoint is accessible
3. Ensure the webhook secret in your environment variables matches the one in Stripe

### Data Sync Issues

If products or features aren't syncing correctly:

1. Check that the webhook events are being received
2. Verify the database tables have the correct structure
3. Run the migration script to force a sync:
   ```bash
   npm run stripe:migrate-products
   ```

### Testing Product Changes

To test how product changes affect the frontend:

1. Use the Stripe test environment
2. Update product metadata in the Stripe Dashboard
3. Check that the changes appear in the Pricing page and other relevant UI components

## Implementation Details

The main implementation files:

- `src/lib/stripe/webhook.ts` - Webhook event handlers
- `src/lib/stripe/client.ts` - Stripe API client functions
- `src/pages/Pricing.tsx` - Frontend display of product tiers and features
- `scripts/register-product-price-webhooks.sh` - Script to register webhooks
- `scripts/migrate-products-to-stripe.ts` - Script to migrate products to Stripe 