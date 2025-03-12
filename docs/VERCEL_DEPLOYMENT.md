# SubPirate Vercel Deployment Guide

This guide will walk you through deploying SubPirate to Vercel with proper configuration for production use.

## Prerequisites

1. A Vercel account ([Sign up here](https://vercel.com/signup) if you don't have one)
2. The SubPirate repository cloned to your local machine
3. Your Stripe account set up with production keys
4. Your Supabase project configured for production

## Deployment Steps

### 1. Prepare Your Repository

Ensure you have the `production-vercel` branch ready:

```bash
# If you haven't created the branch yet
git checkout -b production-vercel

# If the branch already exists
git checkout production-vercel
```

Verify that your repository includes:
- Updated `vercel.json` with proper route handling
- Configured `env.production` file with Vercel environment variables
- All necessary server-side code for webhooks and API handling

### 2. Configure Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your SubPirate repository
4. Select the "production-vercel" branch for deployment
5. Configure the project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:production`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Set Environment Variables

Add the following environment variables in your Vercel project settings:

#### Production Environment Variables:

```
# Stripe Production
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PROD_WEBHOOK_SECRET=whsec_...

# Supabase
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Other Config
NODE_ENV=production
```

#### Preview Environment Variables (for branch deployments):

For preview environments, use your test Stripe keys:

```
# Stripe Test
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_TEST_WEBHOOK_SECRET=whsec_...

# Same Supabase variables as production
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Other Config
NODE_ENV=production
```

### 4. Deploy Your Project

1. Click "Deploy" to start the deployment process
2. Vercel will build and deploy your application
3. Once complete, Vercel will provide you with a deployment URL

### 5. Configure Custom Domain (Optional)

1. In your project settings, go to "Domains"
2. Add your custom domain (e.g., `subpirate.com`)
3. Follow Vercel's instructions to verify domain ownership and set up DNS

### 6. Set Up Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your production webhook URL: `https://your-domain.com/api/stripe/webhook`
4. Select these events to listen for:
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

5. Copy the webhook signing secret
6. Add it to your Vercel environment variables as `VITE_STRIPE_PROD_WEBHOOK_SECRET`

### 7. Verify Deployment

1. Visit your deployed site
2. Test the authentication flow
3. Verify Stripe integration by checking out a subscription
4. Ensure webhook events are properly received and processed

## Continuous Deployment

Vercel automatically deploys changes when you push to your configured branch:

1. Make changes locally
2. Commit and push to the `production-vercel` branch
3. Vercel will automatically rebuild and deploy your application

## Environment Detection

SubPirate's Stripe client automatically detects your environment to use the correct Stripe keys:

- Production domains use live Stripe keys
- Preview deployments (vercel.app) use test Stripe keys
- localhost:* always uses test keys

## Troubleshooting

### Webhook Issues

If webhooks aren't being received:

1. Check Stripe Dashboard webhook logs
2. Ensure your webhook endpoint is accessible from Stripe
3. Verify the correct webhook secret is set in environment variables
4. Test the webhook using Stripe's webhook testing tool

### Stripe Key Mismatch

If you see errors about using test keys in production or vice versa:

1. Check your environment variables in Vercel
2. Run the diagnostic script locally: `npm run stripe:test-env`
3. Ensure domain-based environment detection is working correctly

### Build Failures

If your build fails on Vercel:

1. Check the Vercel build logs for specific errors
2. Ensure all dependencies are properly listed in package.json
3. Verify your build command is correctly configured

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
