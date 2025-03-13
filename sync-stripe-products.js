// sync-stripe-products.js
// This script syncs Stripe products and prices to Supabase

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Load environment variables from .env file
dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia'
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Product IDs to sync (from your test environment)
const productIds = [
  'prod_RpekF2EAu1npzb', // Starter
  'prod_RpekhttqS8GKpE', // Creator
  'prod_RpekrPRCVGOqJM', // Pro
  'prod_Rpek1uw0yBJmLG'  // Agency
];

// Function to sync a product and its prices
async function syncProductAndPrices(productId) {
  try {
    console.log(`Syncing product ${productId}...`);
    
    // Get product from Stripe
    const product = await stripe.products.retrieve(productId);
    
    // Check if product exists in Supabase
    const { data: existingProduct } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('stripe_product_id', product.id)
      .single();
    
    // Insert or update product
    if (existingProduct) {
      console.log(`Updating existing product ${product.id} (${product.name})...`);
      await supabase
        .from('stripe_products')
        .update({
          name: product.name,
          description: product.description || '',
          active: product.active,
          metadata: product.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_product_id', product.id);
    } else {
      console.log(`Inserting new product ${product.id} (${product.name})...`);
      await supabase.from('stripe_products').insert({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description || '',
        active: product.active,
        metadata: product.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Get prices for this product from Stripe
    const prices = await stripe.prices.list({
      product: productId,
      active: true
    });
    
    // Sync each price
    for (const price of prices.data) {
      console.log(`Syncing price ${price.id} for product ${productId}...`);
      
      // Check if price exists in Supabase
      const { data: existingPrice } = await supabase
        .from('stripe_prices')
        .select('*')
        .eq('id', price.id)
        .single();
      
      // Insert or update price
      if (existingPrice) {
        console.log(`Updating existing price ${price.id}...`);
        await supabase
          .from('stripe_prices')
          .update({
            currency: price.currency,
            unit_amount: price.unit_amount,
            recurring_interval: price.recurring?.interval,
            type: price.type,
            active: price.active,
            stripe_product_id: price.product,
            updated_at: new Date().toISOString()
          })
          .eq('id', price.id);
      } else {
        console.log(`Inserting new price ${price.id}...`);
        await supabase.from('stripe_prices').insert({
          id: price.id,
          stripe_product_id: price.product,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval,
          type: price.type,
          active: price.active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`Successfully synced product ${productId} and ${prices.data.length} prices`);
  } catch (error) {
    console.error(`Error syncing product ${productId}:`, error);
  }
}

// Main function to sync all products and prices
async function syncAllProductsAndPrices() {
  console.log('Starting Stripe product and price sync...');
  
  for (const productId of productIds) {
    await syncProductAndPrices(productId);
  }
  
  console.log('Sync completed!');
}

// Run the sync
syncAllProductsAndPrices()
  .then(() => {
    console.log('Script execution completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  }); 