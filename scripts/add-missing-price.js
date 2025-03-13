#!/usr/bin/env node

/**
 * Add Missing Starter Price
 * 
 * This script adds the missing Starter price to the database.
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

async function addMissingPrice() {
  console.log(chalk.blue('Adding missing Starter price to the database...'));
  
  // First, check if the price exists
  const { data, error: checkError } = await supabase
    .from('stripe_prices')
    .select('*')
    .eq('id', 'price_1Qvz1UCtsTY6FiiZTyGPNs1F');
  
  if (checkError) {
    console.error(chalk.red('Error checking for existing price:'), checkError);
    return;
  }
  
  if (data && data.length > 0) {
    // The price exists, check if the product ID is correct
    const existingPrice = data[0];
    
    if (existingPrice.stripe_product_id !== 'prod_RpeI6jwcgu6H8w') {
      // Update the product ID
      console.log(chalk.cyan(`Updating existing price ${existingPrice.id} to link to product prod_RpeI6jwcgu6H8w`));
      
      const { error: updateError } = await supabase
        .from('stripe_prices')
        .update({ 
          stripe_product_id: 'prod_RpeI6jwcgu6H8w',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPrice.id);
      
      if (updateError) {
        console.error(chalk.red(`Failed to update price:`, updateError));
      } else {
        console.log(chalk.green(`✓ Successfully updated price to link to Starter product`));
      }
    } else {
      console.log(chalk.green(`✓ Price already exists and is correctly linked to product`));
    }
  } else {
    // The price doesn't exist, insert it
    console.log(chalk.cyan(`Inserting new price for Starter product`));
    
    const { error: insertError } = await supabase
      .from('stripe_prices')
      .insert({
        id: 'price_1Qvz1UCtsTY6FiiZTyGPNs1F',
        stripe_product_id: 'prod_RpeI6jwcgu6H8w',
        active: true,
        currency: 'usd',
        unit_amount: 1900,
        type: 'recurring',
        recurring_interval: 'month',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error(chalk.red(`Failed to insert price:`, insertError));
    } else {
      console.log(chalk.green(`✓ Successfully inserted new Starter price`));
    }
  }
  
  console.log(chalk.green('\n✅ Price update complete!'));
}

// Run the function
addMissingPrice().catch(err => {
  console.error(chalk.red('Error adding price:'), err);
  process.exit(1);
}); 