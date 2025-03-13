# SubPirate Stripe Production Checklist

Use this checklist to verify that your Stripe integration is properly configured for production.

## Environment Variables

- [ ] Production API Keys
  - [ ] `VITE_STRIPE_SECRET_KEY` is set with a live key (`sk_live_...`)
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY` is set with a live key (`pk_live_...`)
  - [ ] `VITE_STRIPE_PROD_WEBHOOK_SECRET` is set with the production webhook signing secret
  - [ ] `VITE_STRIPE_BASE_URL` is set to your production domain

- [ ] Test API Keys (for local development)
  - [ ] `VITE_STRIPE_TEST_SECRET_KEY` is set with a test key (`sk_test_...`)
  - [ ] `VITE_STRIPE_TEST_PUBLISHABLE_KEY` is set with a test key (`pk_test_...`)
  - [ ] `VITE_STRIPE_TEST_WEBHOOK_SECRET` is set with the test webhook signing secret

## Vercel Configuration

- [ ] Environment Variables on Vercel
  - [ ] Production environment has live Stripe keys
  - [ ] Preview environments have test Stripe keys
  - [ ] Environment variables are properly scoped to their environments

## Stripe Dashboard Configuration

- [ ] Account Setup
  - [ ] Account is fully verified and activated for live mode
  - [ ] Business information is complete
  - [ ] Bank account is connected for payouts
  - [ ] Tax settings are configured (if applicable)

- [ ] Products & Prices
  - [ ] All subscription products are created in live mode
  - [ ] Prices are correctly configured (billing period, currency, etc.)
  - [ ] Products are properly tagged with metadata for feature mapping

- [ ] Webhooks
  - [ ] Production webhook endpoint is created
  - [ ] Webhook is configured with all required events
  - [ ] Webhook events are being delivered successfully (check logs)
  - [ ] Events are being processed correctly by your application

## Database Configuration

- [ ] Tables
  - [ ] `subscription_features` table is properly configured
  - [ ] `stripe_products` table is synced with live products
  - [ ] `stripe_prices` table is synced with live prices
  - [ ] `product_features` table maps features to products
  - [ ] `customer_subscriptions` table is ready to store subscriptions

## Code Configuration

- [ ] Environment Detection
  - [ ] Stripe client correctly identifies production vs test environments
  - [ ] Run `npm run stripe:test-env` to verify environment detection
  - [ ] Webhook handler uses the correct secret based on the environment

- [ ] Error Handling
  - [ ] Checkout session creation has proper error handling
  - [ ] Webhook handler has comprehensive error handling
  - [ ] Client-side errors are properly reported and logged

## Testing

- [ ] Verification Script
  - [ ] Run `npm run stripe:verify` to check production setup
  - [ ] All checks pass without errors

- [ ] End-to-End Testing
  - [ ] Test checkout flow with a real card in live mode
  - [ ] Verify subscription creation works in production
  - [ ] Test customer portal for subscription management
  - [ ] Verify webhooks are received and processed correctly

## Monitoring & Maintenance

- [ ] Monitoring Setup
  - [ ] Error logging is configured for Stripe-related errors
  - [ ] Webhook failures are monitored and reported
  - [ ] Key subscription events are logged for audit purposes

- [ ] Operational Procedures
  - [ ] Procedures are in place for handling failed payments
  - [ ] Regular sync of products and prices is scheduled
  - [ ] Process exists for monitoring Stripe Dashboard events

## Security

- [ ] Security Checks
  - [ ] API keys are stored securely and not exposed to clients
  - [ ] Webhook signature verification is implemented
  - [ ] Customer data is handled according to PCI compliance requirements

## Documentation

- [ ] User Documentation
  - [ ] Subscription management instructions are provided to users
  - [ ] Payment method update process is documented
  - [ ] Cancellation and refund policies are clearly stated

## Launch Readiness

- [ ] Final Checklist
  - [ ] All verification scripts pass successfully
  - [ ] Test transactions complete successfully in live mode
  - [ ] Team is trained on Stripe Dashboard usage
  - [ ] Support processes are in place for subscription issues 