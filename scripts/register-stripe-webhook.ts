#!/usr/bin/env ts-node

/**
 * Stripe Webhook Registration Script
 * 
 * This script registers a webhook endpoint with Stripe, ensuring it receives
 * all necessary events to keep your database in sync with Stripe.
 * 
 * Usage:
 *   ts-node scripts/register-stripe-webhook.ts
 */

import * as dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
dotenv.config();

const STRIPE_SECRET_KEY = process.env.VITE_STRIPE_SECRET_KEY || '';
const WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL || ''; // e.g., https://your-domain.com/api/stripe/webhook

// Events needed for full synchronization
const REQUIRED_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
];

async function registerWebhook() {
  if (!STRIPE_SECRET_KEY) {
    console.error('Error: VITE_STRIPE_SECRET_KEY not found in environment variables');
    process.exit(1);
  }

  if (!WEBHOOK_URL) {
    console.error('Error: STRIPE_WEBHOOK_URL not found in environment variables');
    console.error('Please set STRIPE_WEBHOOK_URL to your webhook endpoint URL');
    console.error('Example: https://your-domain.com/api/stripe/webhook');
    process.exit(1);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    // List existing webhooks
    console.log('Checking for existing webhooks...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    // Check if we already have a webhook with the same URL
    const existingWebhook = webhooks.data.find(
      webhook => webhook.url === WEBHOOK_URL
    );

    if (existingWebhook) {
      console.log(`Found existing webhook: ${existingWebhook.id}`);
      
      // Check if it has all the events we need
      const existingEvents = new Set(existingWebhook.enabled_events);
      const missingEvents = REQUIRED_EVENTS.filter(event => !existingEvents.has(event));
      
      if (missingEvents.length > 0 || existingEvents.size !== REQUIRED_EVENTS.length) {
        console.log('Updating webhook with required events...');
        
        await stripe.webhookEndpoints.update(existingWebhook.id, {
          enabled_events: REQUIRED_EVENTS,
        });
        
        console.log('Webhook updated successfully with all required events');
      } else {
        console.log('Webhook already has all required events');
      }
    } else {
      // Create new webhook
      console.log('Creating new webhook endpoint...');
      
      const webhook = await stripe.webhookEndpoints.create({
        url: WEBHOOK_URL,
        enabled_events: REQUIRED_EVENTS,
        description: 'Automatic sync of products, prices, and subscriptions',
      });
      
      console.log(`Webhook created successfully: ${webhook.id}`);
      console.log(`Webhook Secret: ${webhook.secret}`);
      console.log('IMPORTANT: Add this secret to your environment variables:');
      console.log(`VITE_STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    }
    
    console.log('Done!');
  } catch (error: any) {
    console.error('Error registering webhook:', error.message);
    process.exit(1);
  }
}

registerWebhook().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 