#!/usr/bin/env node

/**
 * Fix Zero Price Amounts in Stripe Prices
 * 
 * This script updates the unit_amount for Stripe prices in the database
 * that currently have zero values.
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

// Price mapping with correct amounts
const priceUpdates = [
  {
    id: 'price_1Qvz1UCtsTY6FiiZTyGPNs1F', // Starter price
    unit_amount: 1900,
    type: 'recurring'
  },
  {
    id: 'price_1Qvz3GCtsTY6FiiZtiU2XiAq', // Creator price
    unit_amount: 3400,
    type: 'recurring'
  },
  {
    id: 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk', // Pro price
    unit_amount: 4900,
    type: 'recurring'
  },
  {
    id: 'price_1Qvz27CtsTY6FiiZYbT6acEB', // Agency price
    unit_amount: 9700,
    type: 'recurring'
  }
];

async function fixPrices() {
  console.log(chalk.blue('Fixing price amounts in the database...'));
  
  for (const price of priceUpdates) {
    console.log(chalk.cyan(`Updating price ${price.id} to ${price.unit_amount / 100} ${price.currency || 'USD'}`));
    
    const { error } = await supabase
      .from('stripe_prices')
      .update({ 
        unit_amount: price.unit_amount,
        type: price.type,
        updated_at: new Date().toISOString()
      })
      .eq('id', price.id);
    
    if (error) {
      console.error(chalk.red(`Failed to update price ${price.id}:`), error);
    } else {
      console.log(chalk.green(`✓ Successfully updated price ${price.id}`));
    }
  }
  
  console.log(chalk.green('\n✅ Price fixes complete!'));
  console.log(chalk.yellow('\nYou should now be able to access your site without seeing the "Test Mode Active" message.'));
  console.log(chalk.yellow('Make sure you\'re accessing the site via your production domain and that it\'s a production build.'));
}

// Run the update function
fixPrices().catch(err => {
  console.error(chalk.red('Error updating prices:'), err);
  process.exit(1);
}); 