#!/usr/bin/env node

/**
 * Production Stripe Configuration Verification
 * 
 * This script verifies that your Stripe production configuration is correct
 * and ready for deployment.
 */

import { config } from 'dotenv';
import chalk from 'chalk';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.production
config({ path: resolve(__dirname, '../.env.production') });

console.log(chalk.cyan('=== SubPirate Stripe Production Configuration Verification ==='));
console.log(chalk.cyan('This script will verify your Stripe production setup is ready to go\n'));

// Check environment variables
console.log(chalk.yellow('1. Checking environment variables:'));
const envVars = [
  'VITE_STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PROD_WEBHOOK_SECRET',
  'VITE_STRIPE_BASE_URL'
];

let missingVars = 0;
envVars.forEach(varName => {
  if (process.env[varName]) {
    if (varName.includes('SECRET_KEY') && !process.env[varName].startsWith('sk_live_')) {
      console.log(chalk.red(`✗ ${varName} is not a production key`));
      missingVars++;
    } else if (varName.includes('PUBLISHABLE_KEY') && !process.env[varName].startsWith('pk_live_')) {
      console.log(chalk.red(`✗ ${varName} is not a production key`));
      missingVars++;
    } else {
      const maskedValue = process.env[varName].substring(0, 8) + '...';
      console.log(chalk.green(`✓ ${varName} is set`), chalk.gray(`(${maskedValue})`));
    }
  } else {
    console.log(chalk.red(`✗ ${varName} is missing`));
    missingVars++;
  }
});

if (missingVars > 0) {
  console.log(chalk.red(`\n❌ Found ${missingVars} issues with environment variables.`));
  console.log(chalk.yellow(`   Please fix these issues before proceeding to production.`));
} else {
  console.log(chalk.green(`\n✓ All environment variables are properly configured!`));
}

// Initialize Stripe client
let stripe;
try {
  stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
  });
  console.log(chalk.green('\n✓ Successfully initialized Stripe client with production key'));
} catch (error) {
  console.log(chalk.red(`\n❌ Failed to initialize Stripe client: ${error.message}`));
  process.exit(1);
}

// Test Stripe connection
console.log(chalk.yellow('\n2. Testing Stripe API connection...'));
async function testStripeConnection() {
  try {
    const balance = await stripe.balance.retrieve();
    console.log(chalk.green('✓ Successfully connected to Stripe API and retrieved balance information'));
    
    // Check for products
    console.log(chalk.yellow('\n3. Checking for products in your Stripe account...'));
    const products = await stripe.products.list({ limit: 5, active: true });
    
    if (products.data.length > 0) {
      console.log(chalk.green(`✓ Found ${products.data.length} active products in your Stripe account`));
      products.data.forEach(product => {
        console.log(chalk.cyan(`   - ${product.name} (${product.id})`));
      });
      
      // Check for prices
      console.log(chalk.yellow('\n4. Checking prices for your products...'));
      let hasAllPrices = true;
      
      for (const product of products.data) {
        const prices = await stripe.prices.list({ 
          product: product.id,
          active: true,
          limit: 5 
        });
        
        if (prices.data.length > 0) {
          console.log(chalk.green(`✓ Found ${prices.data.length} active prices for product "${product.name}"`));
          prices.data.forEach(price => {
            const amount = price.unit_amount / 100;
            const currency = price.currency.toUpperCase();
            const interval = price.recurring ? `${price.recurring.interval_count} ${price.recurring.interval}` : 'one-time';
            console.log(chalk.cyan(`   - ${amount} ${currency} (${interval})`));
          });
        } else {
          console.log(chalk.red(`❌ No prices found for product "${product.name}"`));
          hasAllPrices = false;
        }
      }
      
      if (!hasAllPrices) {
        console.log(chalk.yellow('\nWarning: You need to create prices for all your products'));
        console.log(chalk.yellow('Visit https://dashboard.stripe.com/products to create prices'));
      }
    } else {
      console.log(chalk.red('❌ No active products found in your Stripe account'));
      console.log(chalk.yellow('You need to create products and prices before going to production'));
      console.log(chalk.yellow('Visit https://dashboard.stripe.com/products to set up your products'));
    }
    
    // Check webhook configuration
    console.log(chalk.yellow('\n5. Checking webhook configuration...'));
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    
    const productionUrl = process.env.VITE_STRIPE_BASE_URL || '';
    const hasProductionWebhook = webhooks.data.some(webhook => 
      webhook.url.includes(productionUrl) || 
      webhook.url.includes('subpirate.com') ||
      webhook.url.includes('/api/stripe/webhook') ||
      webhook.url.includes('/api/webhook')
    );
    
    if (hasProductionWebhook) {
      console.log(chalk.green('✓ Found webhook configured for production'));
      
      // Verify required events
      const requiredEvents = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated', 
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ];
      
      const webhooksWithEvents = webhooks.data.filter(webhook => 
        webhook.url.includes(productionUrl) || 
        webhook.url.includes('subpirate.com') ||
        webhook.url.includes('/api/stripe/webhook') ||
        webhook.url.includes('/api/webhook')
      );
      
      let missingEvents = [];
      for (const webhook of webhooksWithEvents) {
        for (const requiredEvent of requiredEvents) {
          if (!webhook.enabled_events.includes(requiredEvent) && 
              !webhook.enabled_events.includes('*')) {
            missingEvents.push(requiredEvent);
          }
        }
      }
      
      if (missingEvents.length > 0) {
        console.log(chalk.red(`❌ Missing required webhook events: ${missingEvents.join(', ')}`));
        console.log(chalk.yellow('Update your webhook to include these events at:'));
        console.log(chalk.yellow('https://dashboard.stripe.com/webhooks'));
      } else {
        console.log(chalk.green('✓ All required webhook events are configured'));
      }
    } else {
      console.log(chalk.red('❌ No production webhook configured'));
      console.log(chalk.yellow('You need to create a webhook endpoint for your production domain at:'));
      console.log(chalk.yellow('https://dashboard.stripe.com/webhooks'));
      console.log(chalk.yellow(`Webhook URL should be: ${productionUrl}/api/stripe/webhook`));
    }
    
    // Final verdict
    console.log(chalk.cyan('\n=== Production Readiness Summary ==='));
    if (missingVars === 0 && products.data.length > 0 && hasProductionWebhook) {
      console.log(chalk.green('🎉 Your Stripe production configuration looks good to go!'));
    } else {
      console.log(chalk.yellow('⚠️ Your Stripe production configuration needs attention before going live.'));
      console.log(chalk.yellow('Please fix the issues highlighted above.'));
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Failed to test Stripe connection: ${error.message}`));
  }
}

testStripeConnection().catch(error => {
  console.error(chalk.red(`Unexpected error: ${error.message}`));
  process.exit(1);
}); 