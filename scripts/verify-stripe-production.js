import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { promises as fs } from 'fs';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Check for required environment variables
const requiredEnvVars = [
  'VITE_STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_WEBHOOK_SECRET',
  'VITE_STRIPE_PROD_WEBHOOK_SECRET',
  'VITE_STRIPE_BASE_URL'
];

// Set up Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripeSecretKey = process.env.VITE_STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
});

// Check functions
async function checkEnvironmentVariables() {
  console.log(chalk.blue('Checking environment variables...'));
  
  let allPresent = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(chalk.red(`❌ Missing ${envVar}`));
      allPresent = false;
    } else {
      // Check if it's a live key for production variables
      if (envVar === 'VITE_STRIPE_SECRET_KEY' && !process.env[envVar].startsWith('sk_live_')) {
        console.log(chalk.yellow(`⚠️ ${envVar} should be a production key (sk_live_...)`));
        allPresent = false;
      } else if (envVar === 'VITE_STRIPE_PUBLISHABLE_KEY' && !process.env[envVar].startsWith('pk_live_')) {
        console.log(chalk.yellow(`⚠️ ${envVar} should be a production key (pk_live_...)`));
        allPresent = false;
      } else {
        console.log(chalk.green(`✓ ${envVar} is set`));
      }
    }
  }
  
  return allPresent;
}

async function checkStripeConnection() {
  console.log(chalk.blue('\nChecking Stripe connection...'));
  
  try {
    const account = await stripe.account.retrieve();
    console.log(chalk.green(`✓ Connected to Stripe account: ${account.business_profile?.name || account.email}`));
    
    // Check if account is in test mode
    if (!account.charges_enabled) {
      console.log(chalk.yellow('⚠️ Account is not fully activated. Charges are not enabled.'));
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to connect to Stripe: ${error.message}`));
    return false;
  }
}

async function checkWebhookEndpoints() {
  console.log(chalk.blue('\nChecking webhook endpoints...'));
  
  try {
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log(chalk.red('❌ No webhook endpoints configured in Stripe'));
      return false;
    }
    
    const productionUrl = process.env.VITE_STRIPE_BASE_URL;
    const productionEndpoint = webhooks.data.find(webhook => 
      webhook.url.includes(productionUrl) || 
      (productionUrl && webhook.url.includes(productionUrl.replace('https://', '')))
    );
    
    if (!productionEndpoint) {
      console.log(chalk.red(`❌ No webhook endpoint found for production URL: ${productionUrl}`));
      console.log(chalk.yellow('Available webhooks:'));
      webhooks.data.forEach(webhook => {
        console.log(chalk.yellow(`  - ${webhook.url} (${webhook.status})`));
      });
      return false;
    }
    
    console.log(chalk.green(`✓ Production webhook endpoint found: ${productionEndpoint.url}`));
    
    // Check enabled events
    const requiredEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'product.created',
      'product.updated',
      'price.created',
      'price.updated'
    ];
    
    let allEventsEnabled = true;
    
    if (productionEndpoint.enabled_events.includes('*')) {
      console.log(chalk.green('✓ All events are enabled for the webhook'));
    } else {
      for (const event of requiredEvents) {
        if (!productionEndpoint.enabled_events.includes(event)) {
          console.log(chalk.yellow(`⚠️ Event not enabled for webhook: ${event}`));
          allEventsEnabled = false;
        }
      }
      
      if (allEventsEnabled) {
        console.log(chalk.green('✓ All required events are enabled for the webhook'));
      }
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to check webhook endpoints: ${error.message}`));
    return false;
  }
}

async function checkProductsAndPrices() {
  console.log(chalk.blue('\nChecking products and prices...'));
  
  try {
    // Check products
    const products = await stripe.products.list({ active: true, limit: 100 });
    
    if (products.data.length === 0) {
      console.log(chalk.red('❌ No active products found in Stripe'));
      return false;
    }
    
    console.log(chalk.green(`✓ Found ${products.data.length} active products`));
    
    // Check prices
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    
    if (prices.data.length === 0) {
      console.log(chalk.red('❌ No active prices found in Stripe'));
      return false;
    }
    
    console.log(chalk.green(`✓ Found ${prices.data.length} active prices`));
    
    // Check for prices without products
    const pricesWithoutProduct = prices.data.filter(price => !price.product);
    if (pricesWithoutProduct.length > 0) {
      console.log(chalk.yellow(`⚠️ Found ${pricesWithoutProduct.length} prices without associated products`));
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to check products and prices: ${error.message}`));
    return false;
  }
}

async function checkDatabaseTables() {
  console.log(chalk.blue('\nChecking database tables...'));
  
  try {
    // Check if tables exist
    const tables = [
      'stripe_products',
      'stripe_prices',
      'product_features',
      'subscription_features',
      'customer_subscriptions'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(chalk.red(`❌ Error checking table ${table}: ${error.message}`));
      } else {
        console.log(chalk.green(`✓ Table ${table} exists with ${count} rows`));
      }
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to check database tables: ${error.message}`));
    return false;
  }
}

async function main() {
  console.log(chalk.bgBlue.white(' Stripe Production Readiness Check '));
  console.log('');
  
  const envVarsReady = await checkEnvironmentVariables();
  const stripeConnectionReady = await checkStripeConnection();
  const webhooksReady = await checkWebhookEndpoints();
  const productsReady = await checkProductsAndPrices();
  const databaseReady = await checkDatabaseTables();
  
  console.log('');
  console.log(chalk.bgBlue.white(' Production Readiness Summary '));
  console.log('');
  
  console.log(`${envVarsReady ? chalk.green('✓') : chalk.red('❌')} Environment Variables`);
  console.log(`${stripeConnectionReady ? chalk.green('✓') : chalk.red('❌')} Stripe Connection`);
  console.log(`${webhooksReady ? chalk.green('✓') : chalk.red('❌')} Webhook Configuration`);
  console.log(`${productsReady ? chalk.green('✓') : chalk.red('❌')} Products and Prices`);
  console.log(`${databaseReady ? chalk.green('✓') : chalk.red('❌')} Database Tables`);
  
  console.log('');
  if (envVarsReady && stripeConnectionReady && webhooksReady && productsReady && databaseReady) {
    console.log(chalk.bgGreen.black(' Your Stripe integration is ready for production! '));
  } else {
    console.log(chalk.bgYellow.black(' Your Stripe integration needs attention before going to production. '));
    console.log('Please address the issues above and run this script again.');
  }
}

main().catch(error => {
  console.error('Error running verification script:', error);
  process.exit(1);
}); 