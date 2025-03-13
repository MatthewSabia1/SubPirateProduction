#!/usr/bin/env node

/**
 * Script to check what type of Stripe key is being used
 * 
 * This script helps identify if you're using test or live keys
 * by making a request to Stripe and checking the response.
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Log all environment variables with STRIPE in their name (masked)
console.log('Stripe environment variables found:');
Object.keys(process.env).forEach(key => {
  if (key.includes('STRIPE')) {
    // Mask the value for security
    const value = process.env[key];
    const maskedValue = value ? 
      (value.startsWith('sk_') ? 
        value.substring(0, 7) + '...' + value.substring(value.length - 4) : 
        '[non-secret-key]') 
      : '[undefined]';
    console.log(`${key}: ${maskedValue}`);
  }
});

// Get Stripe secret key from environment variables
const stripeKey = process.env.VITE_STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('No Stripe secret key found in environment variables');
  process.exit(1);
}

// Initialize Stripe client with the key
const stripe = new Stripe(stripeKey);

// Check what mode the key is for by making a request to Stripe
async function checkKeyMode() {
  try {
    console.log(`\nChecking Stripe key starting with ${stripeKey.substring(0, 7)}...`);
    
    // Make a simple request to Stripe to see if it's valid
    const balance = await stripe.balance.retrieve();
    
    // Check the key type based on the key string
    const keyType = stripeKey.startsWith('sk_live_') ? 'LIVE' : 
                   stripeKey.startsWith('sk_test_') ? 'TEST' : 
                   'UNKNOWN';
    
    console.log(`Key type based on prefix: ${keyType}`);
    console.log(`Balance retrieval successful`);
    
    // Make a request to get a price to check livemode
    const prices = await stripe.prices.list({ limit: 1 });
    if (prices.data.length > 0) {
      console.log(`\nSample price from Stripe:`);
      console.log(`- ID: ${prices.data[0].id}`);
      console.log(`- Live mode: ${prices.data[0].livemode}`);
      console.log(`- Product: ${prices.data[0].product}`);
      console.log(`- Amount: ${prices.data[0].unit_amount/100} ${prices.data[0].currency.toUpperCase()}`);
    } else {
      console.log('No prices found in this Stripe account');
    }
    
  } catch (error) {
    console.error('Error checking Stripe key:', error.message);
    process.exit(1);
  }
}

checkKeyMode(); 