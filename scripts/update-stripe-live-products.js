#!/usr/bin/env node

/**
 * Update Stripe Product and Price IDs Script
 * 
 * This script updates the database with live mode product and price IDs
 * to resolve the "Test Mode Active" message in the UI.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('Missing Supabase credentials. Please check your .env file.'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping of placeholder IDs to live mode IDs
const productIdMapping = {
  'prod_starter': 'prod_RpeI6jwcgu6H8w',
  'prod_creator': 'prod_RpeDP1ClkYl7nH',
  'prod_pro': 'prod_RpeErBzCSyArMr',
  'prod_agency': 'prod_RpeE3bsaw2nQ7N',
};

// Price ID mapping
const priceIds = {
  'prod_RpeI6jwcgu6H8w': 'price_1Qvz1UCtsTY6FiiZTyGPNs1F', // Starter
  'prod_RpeDP1ClkYl7nH': 'price_1Qvz3GCtsTY6FiiZtiU2XiAq', // Creator
  'prod_RpeErBzCSyArMr': 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk', // Pro
  'prod_RpeE3bsaw2nQ7N': 'price_1Qvz27CtsTY6FiiZYbT6acEB', // Agency
};

// Names of the products for display purposes
const productNames = {
  'prod_RpeI6jwcgu6H8w': 'Starter',
  'prod_RpeDP1ClkYl7nH': 'Creator',
  'prod_RpeErBzCSyArMr': 'Pro',
  'prod_RpeE3bsaw2nQ7N': 'Agency',
};

async function updateStripeProducts() {
  console.log(chalk.blue('Updating Stripe product IDs in the database...'));
  
  // 1. First, update product_features table since it references stripe_products
  for (const [oldId, newId] of Object.entries(productIdMapping)) {
    console.log(chalk.cyan(`Updating product features for ${productNames[newId]} (${oldId} → ${newId})`));
    
    const { error } = await supabase
      .from('product_features')
      .update({ stripe_product_id: newId })
      .eq('stripe_product_id', oldId);
    
    if (error) {
      console.error(chalk.red(`Failed to update product features for ${oldId}:`), error);
    } else {
      console.log(chalk.green(`✓ Successfully updated product features for ${oldId}`));
    }
  }
  
  // 2. Update stripe_products table
  for (const [oldId, newId] of Object.entries(productIdMapping)) {
    console.log(chalk.cyan(`Updating product ${productNames[newId]} (${oldId} → ${newId})`));
    
    const { error } = await supabase
      .from('stripe_products')
      .update({ stripe_product_id: newId })
      .eq('stripe_product_id', oldId);
    
    if (error) {
      console.error(chalk.red(`Failed to update product ${oldId}:`), error);
    } else {
      console.log(chalk.green(`✓ Successfully updated product ${oldId} to ${newId}`));
    }
  }
  
  // 3. Update stripe_prices table with new price IDs and product IDs
  console.log(chalk.blue('\nUpdating price IDs in the database...'));
  
  for (const [productId, priceId] of Object.entries(priceIds)) {
    console.log(chalk.cyan(`Setting price for ${productNames[productId]} to ${priceId}`));
    
    // First, find existing price for this product
    const { data: existingPrices, error: fetchError } = await supabase
      .from('stripe_prices')
      .select('*')
      .eq('stripe_product_id', productId)
      .or(`stripe_product_id.eq.${Object.entries(productIdMapping).find(([_, val]) => val === productId)?.[0] || 'none'}`);
    
    if (fetchError) {
      console.error(chalk.red(`Failed to fetch existing prices for ${productId}:`), fetchError);
      continue;
    }
    
    if (existingPrices.length > 0) {
      // Update existing price record
      const { error } = await supabase
        .from('stripe_prices')
        .update({ 
          id: priceId,
          stripe_product_id: productId 
        })
        .eq('id', existingPrices[0].id);
      
      if (error) {
        console.error(chalk.red(`Failed to update price for ${productId}:`), error);
      } else {
        console.log(chalk.green(`✓ Updated price ID to ${priceId}`));
      }
    } else {
      // Create new price record if none exists
      const { error } = await supabase
        .from('stripe_prices')
        .insert({ 
          id: priceId,
          stripe_product_id: productId,
          active: true,
          currency: 'usd',
          recurring_interval: 'month',
          // Set appropriate amount based on the product
          unit_amount: productId === 'prod_RpeI6jwcgu6H8w' ? 1900 : 
                        productId === 'prod_RpeErBzCSyArMr' ? 4900 :
                        productId === 'prod_RpeDP1ClkYl7nH' ? 3400 : 9700,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(chalk.red(`Failed to create price for ${productId}:`), error);
      } else {
        console.log(chalk.green(`✓ Created new price ID ${priceId}`));
      }
    }
  }
  
  console.log(chalk.green('\n✅ Database update complete!'));
  console.log(chalk.yellow('\nYou should now be able to access your site without seeing the "Test Mode Active" message.'));
  console.log(chalk.yellow('Make sure you\'re accessing the site via your production domain and that it\'s a production build.'));
}

// Run the update function
updateStripeProducts().catch(err => {
  console.error(chalk.red('Error updating database:'), err);
  process.exit(1);
}); 