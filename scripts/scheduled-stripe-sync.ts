#!/usr/bin/env ts-node

/**
 * Scheduled Stripe Data Synchronization Script
 * 
 * This script synchronizes products and prices from Stripe to your Supabase database.
 * It should be run on a regular schedule (e.g., daily via cron) to ensure your 
 * database stays in sync with Stripe, even if webhook events are missed.
 * 
 * Usage: 
 *   ts-node scripts/scheduled-stripe-sync.ts
 * 
 * Or add to crontab:
 *   0 0 * * * cd /path/to/app && ts-node scripts/scheduled-stripe-sync.ts >> /var/log/stripe-sync.log 2>&1
 */

import * as dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types';

// Initialize dotenv
dotenv.config();

// Initialize Stripe with your API key
const stripeApiKey = process.env.VITE_STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeApiKey);

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Log with timestamp
function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function syncStripeData() {
  log('Starting scheduled Stripe data synchronization...');
  
  if (!stripeApiKey || !supabaseUrl || !supabaseServiceKey) {
    log('ERROR: Missing required environment variables. Check your .env file.');
    process.exit(1);
  }
  
  try {
    // 1. Fetch all active products from Stripe
    log('Fetching products from Stripe...');
    const { data: stripeProducts } = await stripe.products.list({ 
      limit: 100,
      active: true
    });
    log(`Found ${stripeProducts.length} active products in Stripe`);
    
    // 2. Fetch all active prices from Stripe
    log('Fetching prices from Stripe...');
    const { data: stripePrices } = await stripe.prices.list({ 
      limit: 100,
      active: true 
    });
    log(`Found ${stripePrices.length} active prices in Stripe`);

    // 3. Get existing products and prices from the database
    log('Fetching existing products from database...');
    const { data: dbProducts, error: dbProductsError } = await supabase
      .from('stripe_products')
      .select('stripe_product_id, name, active');
    
    if (dbProductsError) {
      throw new Error(`Error fetching products from database: ${dbProductsError.message}`);
    }
    
    log('Fetching existing prices from database...');
    const { data: dbPrices, error: dbPricesError } = await supabase
      .from('stripe_prices')
      .select('id, stripe_product_id, active, unit_amount');
    
    if (dbPricesError) {
      throw new Error(`Error fetching prices from database: ${dbPricesError.message}`);
    }
    
    log(`Found ${dbProducts.length} products and ${dbPrices.length} prices in database`);
    
    // 4. Process products
    // Create a map of existing products for easy lookup
    const dbProductMap = new Map(
      dbProducts.map(p => [p.stripe_product_id, p])
    );
    
    // Track products to add and update
    const productsToAdd: any[] = [];
    const productsToUpdate: any[] = [];
    
    // Process each Stripe product
    stripeProducts.forEach(product => {
      const existingProduct = dbProductMap.get(product.id);
      
      if (!existingProduct) {
        // New product, add it to the database
        productsToAdd.push({
          stripe_product_id: product.id,
          name: product.name,
          description: product.description || '',
          active: product.active,
          metadata: product.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (
        existingProduct.name !== product.name ||
        existingProduct.active !== product.active
      ) {
        // Product exists but has been updated
        productsToUpdate.push({
          stripe_product_id: product.id,
          name: product.name,
          description: product.description || '',
          active: product.active,
          metadata: product.metadata || {},
          updated_at: new Date().toISOString()
        });
      }
    });
    
    // 5. Process prices
    // Create a map of existing prices for easy lookup
    const dbPriceMap = new Map(
      dbPrices.map(p => [p.id, p])
    );
    
    // Track prices to add and update
    const pricesToAdd: any[] = [];
    const pricesToUpdate: any[] = [];
    
    // Process each Stripe price
    stripePrices.forEach(price => {
      const existingPrice = dbPriceMap.get(price.id);
      
      if (!existingPrice) {
        // New price, add it to the database
        pricesToAdd.push({
          id: price.id,
          stripe_product_id: price.product,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval || null,
          type: price.type,
          active: price.active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (
        existingPrice.unit_amount !== price.unit_amount ||
        existingPrice.active !== price.active
      ) {
        // Price exists but has been updated
        pricesToUpdate.push({
          id: price.id,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval || null,
          type: price.type,
          active: price.active,
          updated_at: new Date().toISOString()
        });
      }
    });
    
    // 6. Handle inactive products and prices
    // Find products in DB that are active but not in Stripe active list
    const activeStripeProductIds = new Set(stripeProducts.map(p => p.id));
    const productsToDeactivate = dbProducts
      .filter(p => p.active && !activeStripeProductIds.has(p.stripe_product_id))
      .map(p => p.stripe_product_id);
    
    // Find prices in DB that are active but not in Stripe active list
    const activeStripePriceIds = new Set(stripePrices.map(p => p.id));
    const pricesToDeactivate = dbPrices
      .filter(p => p.active && !activeStripePriceIds.has(p.id))
      .map(p => p.id);
    
    // 7. Perform database operations
    let successCount = 0;
    let errorCount = 0;
    
    // Add new products
    if (productsToAdd.length > 0) {
      log(`Adding ${productsToAdd.length} new products...`);
      const { error } = await supabase
        .from('stripe_products')
        .insert(productsToAdd);
      
      if (error) {
        log(`ERROR adding products: ${error.message}`);
        errorCount++;
      } else {
        log(`Successfully added ${productsToAdd.length} products`);
        successCount++;
      }
    }
    
    // Update existing products
    if (productsToUpdate.length > 0) {
      log(`Updating ${productsToUpdate.length} existing products...`);
      
      for (const product of productsToUpdate) {
        const { error } = await supabase
          .from('stripe_products')
          .update(product)
          .eq('stripe_product_id', product.stripe_product_id);
        
        if (error) {
          log(`ERROR updating product ${product.stripe_product_id}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      log(`Updated ${productsToUpdate.length} products`);
    }
    
    // Add new prices
    if (pricesToAdd.length > 0) {
      log(`Adding ${pricesToAdd.length} new prices...`);
      const { error } = await supabase
        .from('stripe_prices')
        .insert(pricesToAdd);
      
      if (error) {
        log(`ERROR adding prices: ${error.message}`);
        errorCount++;
      } else {
        log(`Successfully added ${pricesToAdd.length} prices`);
        successCount++;
      }
    }
    
    // Update existing prices
    if (pricesToUpdate.length > 0) {
      log(`Updating ${pricesToUpdate.length} existing prices...`);
      
      for (const price of pricesToUpdate) {
        const { error } = await supabase
          .from('stripe_prices')
          .update(price)
          .eq('id', price.id);
        
        if (error) {
          log(`ERROR updating price ${price.id}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      log(`Updated ${pricesToUpdate.length} prices`);
    }
    
    // Deactivate products no longer active in Stripe
    if (productsToDeactivate.length > 0) {
      log(`Deactivating ${productsToDeactivate.length} products...`);
      
      for (const productId of productsToDeactivate) {
        const { error } = await supabase
          .from('stripe_products')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('stripe_product_id', productId);
        
        if (error) {
          log(`ERROR deactivating product ${productId}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      log(`Deactivated ${productsToDeactivate.length} products`);
    }
    
    // Deactivate prices no longer active in Stripe
    if (pricesToDeactivate.length > 0) {
      log(`Deactivating ${pricesToDeactivate.length} prices...`);
      
      for (const priceId of pricesToDeactivate) {
        const { error } = await supabase
          .from('stripe_prices')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', priceId);
        
        if (error) {
          log(`ERROR deactivating price ${priceId}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      log(`Deactivated ${pricesToDeactivate.length} prices`);
    }
    
    // Report results
    log(`Sync completed with ${successCount} successful operations and ${errorCount} errors`);
    
    if (errorCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    log(`ERROR during synchronization: ${error.message}`);
    process.exit(1);
  }
}

// Run the synchronization
syncStripeData().catch(error => {
  log(`FATAL ERROR: ${error.message}`);
  process.exit(1);
}); 