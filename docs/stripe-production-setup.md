# SubPirate Stripe Production Setup Guide

This guide will walk you through preparing your Stripe integration for production use in SubPirate.

## Stripe Account Setup

Before going to production, make sure your Stripe account is properly set up:

1. **Complete Stripe Verification**:
   - Ensure your account is fully verified with Stripe
   - Complete all required business information
   - Set up your bank account for payouts

2. **Activate Required Capabilities**:
   - Ensure "Card Payments" is active
   - Enable "Subscriptions" product
   - Check if tax collection is configured (if needed)

## Production API Keys

1. **Access Your API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy your production "Secret key" and "Publishable key"

2. **Update Environment Variables**:
   - Edit `.env.production` with your production keys:
   ```
   VITE_STRIPE_SECRET_KEY=sk_live_your_production_secret_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_publishable_key
   ```

## Webhook Setup

1. **Create a Production Webhook Endpoint**:
   - Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - Enter your production URL: `https://your-production-domain.com/api/stripe/webhook`
   - Select these events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `product.created`
     - `product.updated`
     - `price.created`
     - `price.updated`

2. **Get Your Webhook Signing Secret**:
   - After creating the webhook, reveal and copy the "Signing secret"
   - Update `.env.production`:
   ```
   VITE_STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   VITE_STRIPE_PROD_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   ```

## Configuring Vercel Environment Variables

Vercel allows you to set different environment variables for development, preview, and production environments. This is essential for using test Stripe keys locally and in preview deployments, while using live Stripe keys in production.

### Setting Up Environment Variables in Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your SubPirate project
3. Navigate to the "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. For each environment variable, you can specify which environments it applies to:
   - **Production**: Your main domain (subpirate.com)
   - **Preview**: Branch deployments and pull request previews
   - **Development**: Local development with Vercel CLI

### Essential Environment Variables for Stripe

Add the following environment variables to your Vercel project:

#### For Production Environment Only:
- `VITE_STRIPE_PUBLISHABLE_KEY`: Your live publishable key (`pk_live_...`)
- `VITE_STRIPE_SECRET_KEY`: Your live secret key (`sk_live_...`)
- `VITE_STRIPE_PROD_WEBHOOK_SECRET`: Your live webhook signing secret (`whsec_...`)

#### For Preview and Development Environments:
- `VITE_STRIPE_PUBLISHABLE_KEY`: Your test publishable key (`pk_test_...`)
- `VITE_STRIPE_SECRET_KEY`: Your test secret key (`sk_test_...`)
- `VITE_STRIPE_WEBHOOK_SECRET`: Your test webhook signing secret (`whsec_...`)

#### For All Environments:
- `VITE_STRIPE_BASE_URL`: Set to:
  - `https://subpirate.com` for Production
  - `https://[branch]-[project]-[org].vercel.app` for Preview
  - `http://localhost:3000` for Development

### Verifying Environment Detection

Our updated Stripe client automatically detects which environment it's running in based on:
1. The build mode (`process.env.NODE_ENV === 'production'`)
2. The domain name (checking if it's localhost, 127.0.0.1, or includes .vercel.app)

You can verify which environment is being used by checking the console logs when the application starts. Look for:
```
Stripe client initialized in [TEST/PRODUCTION] mode
Running on host: [hostname]
```

## Product & Price Configuration

1. **Set Up Products and Prices**:
   - Add your subscription products in [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
   - Create prices for each product (monthly/yearly options)
   - Mark products as "Active"
   - Add appropriate metadata to help with feature flags

2. **Sync Products with Your Database**:
   - Run the sync script:
   ```bash
   npm run stripe:sync
   ```

## Database Configuration

1. **Verify Database Tables**:
   - Ensure these tables exist and have proper indexes:
     - `subscription_features`
     - `stripe_products`
     - `stripe_prices`
     - `product_features`
     - `customer_subscriptions`

2. **Set Up Feature Flags**:
   - Make sure subscription features are defined in your database
   - Link features to products via the `product_features` table

## Testing End-to-End

1. **Verify Checkout Flow**:
   - Test the entire subscription flow with a test card
   - Verify webhook events are received and processed
   - Check database entries after successful subscription

2. **Test Subscription Management**:
   - Verify customers can update subscription
   - Test cancellation flow
   - Confirm access changes correctly when subscription status changes

## Moving to Production

1. **Run Verification Script**:
   ```bash
   npm run stripe:verify
   ```

2. **Update Base URL**:
   - Set your production domain in `.env.production`:
   ```
   VITE_STRIPE_BASE_URL=https://your-production-domain.com
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Deploy Your Application**:
   - Deploy to your production environment
   - Verify webhook endpoint is accessible

5. **Test Live Setup**:
   - Make a small test purchase with a real card
   - Verify the entire flow works in production
   - Check logs for any errors

## Troubleshooting

### Webhook Issues

- **Event Not Received**: 
  - Check webhook logs in [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
  - Verify your server is accessible to Stripe
  - Check signing secret is correctly configured

- **Signature Verification Failed**:
  - Confirm you're using the correct webhook secret
  - Ensure the raw body is being passed to the Stripe verification

### Subscription Issues

- **Customer Creation Failed**:
  - Check if email addresses are valid
  - Verify Stripe API key permissions

- **Missing Database Entries**:
  - Check webhook handler is correctly processing events
  - Verify database operations are completing successfully

## Maintenance

- **Monitor Webhook Deliveries**:
  - Regularly check [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
  - Look for failed deliveries and resolve issues

- **Keep Products Synced**:
  - After making changes in Stripe Dashboard, run:
  ```bash
  npm run stripe:sync
  ```

- **Update Webhook Events**:
  - If adding new features, ensure relevant events are subscribed to in your webhook configuration 