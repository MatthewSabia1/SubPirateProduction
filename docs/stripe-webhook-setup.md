# Stripe Webhook Setup Guide

## Initial Setup

1. **Authenticate Stripe CLI**
   ```bash
   stripe login
   ```
   - Copy the pairing code shown in the terminal
   - Visit the provided URL
   - Enter the pairing code to authenticate

2. **Start Webhook Listener**
   ```bash
   node scripts/setup-stripe-webhook.js
   ```
   This will:
   - Forward Stripe events to your local server (http://0.0.0.0:5000/api/stripe/webhook)
   - Add the webhook signing secret to your .env file

## Testing Webhooks

After authentication, test the webhook endpoint:

1. **Trigger Test Events**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

2. **Verify Server Logs**
   - Check the server console for webhook processing logs
   - Verify the event was received and processed correctly

## Troubleshooting

If webhook events aren't being received:
1. Ensure the server is running on port 5000
2. Check that the webhook secret in .env matches the one provided by the CLI
3. Verify the webhook endpoint URL is correct
4. Check server logs for any error messages
