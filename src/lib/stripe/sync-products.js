// Stripe Products and Prices Synchronization Script
// This script will fetch all products and prices from Stripe and sync them with your database
// Usage: node src/lib/stripe/sync-products.js

import * as dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize dotenv
dotenv.config();

// Initialize Stripe with your API key
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Official product IDs to track
const OFFICIAL_PRODUCT_IDS = [
  // Current tier products
  'prod_RpekF2EAu1npzb', // Starter
  'prod_RpekhttqS8GKpE', // Creator
  'prod_RpekrPRCVGOqJM', // Pro
  'prod_Rpek1uw0yBJmLG', // Agency
  
  // Legacy products referenced in product_features
  'prod_starter',
  'prod_creator',
  'prod_pro',
  'prod_agency'
];

// Official price IDs to track
const OFFICIAL_PRICE_IDS = [
  'price_1QvzQXCtsTY6FiiZniXOiFkM', // Starter
  'price_1QvzQlCtsTY6FiiZdZlSfPJc', // Creator
  'price_1QvzQyCtsTY6FiiZD1DOaPJi', // Pro
  'price_1QvzRBCtsTY6FiiZEtKt3SYA', // Agency
  'price_1QwAtoCtsTY6FiiZDZ3Jo1YX', // Referenced in subscriptions
];

// Filter function to identify test/temporary products
function isTestProduct(product) {
  // Skip official products
  if (OFFICIAL_PRODUCT_IDS.includes(product.id)) {
    return false;
  }
  
  // Consider products created by Stripe CLI as test products
  if (product.metadata && product.metadata.created_by_stripe_cli === 'true') {
    return true;
  }
  
  // Products with "test" in the name or description
  const nameLC = (product.name || '').toLowerCase();
  const descLC = (product.description || '').toLowerCase();
  if (nameLC.includes('test') || descLC.includes('test')) {
    return true;
  }
  
  // Products with no active prices are likely test products
  return false;
}

// Filter function to identify test prices
function isTestPrice(price) {
  // Skip official prices
  if (OFFICIAL_PRICE_IDS.includes(price.id)) {
    return false;
  }
  
  // Consider prices for test products as test prices
  if (isTestProduct({ id: price.product })) {
    return true;
  }
  
  // Prices with extremely low or high amounts might be test prices
  if (price.unit_amount < 100 || price.unit_amount > 100000) {
    return true;
  }
  
  return false;
}

async function syncStripeData() {
  console.log('Starting Stripe data synchronization...');
  
  try {
    // 1. Fetch all products from Stripe
    console.log('Fetching products from Stripe...');
    const stripeProducts = await stripe.products.list({ limit: 100, active: true });
    console.log(`Found ${stripeProducts.data.length} products in Stripe`);
    
    // Filter out test products
    const productData = stripeProducts.data.filter(product => 
      OFFICIAL_PRODUCT_IDS.includes(product.id) || !isTestProduct(product)
    );
    console.log(`Filtered to ${productData.length} non-test products`);
    
    // 2. Fetch all prices from Stripe
    console.log('Fetching prices from Stripe...');
    const stripePrices = await stripe.prices.list({ limit: 100, active: true });
    console.log(`Found ${stripePrices.data.length} prices in Stripe`);
    
    // Filter out test prices
    const priceData = stripePrices.data.filter(price => 
      OFFICIAL_PRICE_IDS.includes(price.id) || !isTestPrice(price)
    );
    console.log(`Filtered to ${priceData.length} non-test prices`);
    
    // 3. Fetch current products and prices from the database
    console.log('Fetching existing products from database...');
    const { data: dbProducts, error: dbProductsError } = await supabase
      .from('stripe_products')
      .select('stripe_product_id, name');
    
    if (dbProductsError) {
      throw new Error(`Error fetching products from database: ${dbProductsError.message}`);
    }
    
    console.log('Fetching existing prices from database...');
    const { data: dbPrices, error: dbPricesError } = await supabase
      .from('stripe_prices')
      .select('id, stripe_product_id');
    
    if (dbPricesError) {
      throw new Error(`Error fetching prices from database: ${dbPricesError.message}`);
    }
    
    console.log(`Found ${dbProducts.length} products and ${dbPrices.length} prices in database`);
    
    // 4. Sync products
    console.log('Syncing products...');
    const dbProductIds = new Set(dbProducts.map(p => p.stripe_product_id));
    
    // Products to add (in Stripe but not in DB)
    const productsToAdd = productData.filter(p => !dbProductIds.has(p.id));
    console.log(`Found ${productsToAdd.length} new products to add`);
    
    // 5. Sync prices
    console.log('Syncing prices...');
    const dbPriceIds = new Set(dbPrices.map(p => p.id));
    
    // Prices to add (in Stripe but not in DB)
    const pricesToAdd = priceData.filter(p => !dbPriceIds.has(p.id));
    console.log(`Found ${pricesToAdd.length} new prices to add`);
    
    // 6. Add missing products to database
    if (productsToAdd.length > 0) {
      console.log('Adding missing products to database...');
      const productsData = productsToAdd.map(product => ({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description || '',
        active: product.active,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      const { error: insertProductsError } = await supabase
        .from('stripe_products')
        .insert(productsData);
      
      if (insertProductsError) {
        throw new Error(`Error inserting products: ${insertProductsError.message}`);
      }
      
      console.log(`Added ${productsData.length} products to database`);
    }
    
    // 7. Add missing prices to database
    if (pricesToAdd.length > 0) {
      console.log('Adding missing prices to database...');
      const pricesData = pricesToAdd.map(price => ({
        id: price.id,
        stripe_product_id: price.product,
        unit_amount: price.unit_amount,
        currency: price.currency,
        type: price.type,
        recurring_interval: price.recurring?.interval || null,
        active: price.active,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      const { error: insertPricesError } = await supabase
        .from('stripe_prices')
        .insert(pricesData);
      
      if (insertPricesError) {
        throw new Error(`Error inserting prices: ${insertPricesError.message}`);
      }
      
      console.log(`Added ${pricesData.length} prices to database`);
    }
    
    // 8. Fix missing prices that are referenced in subscriptions
    console.log('Checking for missing prices referenced in subscriptions...');
    
    // Fetch all subscriptions
    const { data: allSubscriptions, error: subscriptionsError } = await supabase
      .from('customer_subscriptions')
      .select('stripe_price_id');
    
    if (subscriptionsError) {
      throw new Error(`Error fetching subscriptions: ${subscriptionsError.message}`);
    }
    
    // Filter subscriptions to find those with missing prices
    const missingPrices = allSubscriptions.filter(sub => 
      sub.stripe_price_id && !dbPriceIds.has(sub.stripe_price_id)
    );
    
    if (missingPrices.length > 0) {
      console.log(`Found ${missingPrices.length} subscriptions with missing prices`);
      
      // Get unique missing price IDs
      const uniqueMissingPriceIds = [...new Set(missingPrices.map(p => p.stripe_price_id))];
      console.log('Missing price IDs:', uniqueMissingPriceIds);
      
      // Try to fetch these prices from Stripe
      for (const priceId of uniqueMissingPriceIds) {
        try {
          console.log(`Fetching price ${priceId} from Stripe...`);
          const stripePrice = await stripe.prices.retrieve(priceId);
          
          console.log(`Adding missing price ${priceId} to database...`);
          const { error: insertPriceError } = await supabase
            .from('stripe_prices')
            .insert({
              id: stripePrice.id,
              stripe_product_id: stripePrice.product,
              unit_amount: stripePrice.unit_amount,
              currency: stripePrice.currency,
              type: stripePrice.type,
              recurring_interval: stripePrice.recurring?.interval || null,
              active: stripePrice.active,
              created_at: new Date(),
              updated_at: new Date()
            });
          
          if (insertPriceError) {
            console.error(`Error inserting price ${priceId}: ${insertPriceError.message}`);
          } else {
            console.log(`Successfully added price ${priceId}`);
          }
        } catch (error) {
          console.error(`Error fetching price ${priceId} from Stripe: ${error.message}`);
          
          // If price doesn't exist in Stripe, create a placeholder
          console.log(`Creating placeholder for price ${priceId}...`);
          
          // Default to starter tier if we can't determine the product
          let productId = 'prod_starter';
          const amount = 1900; // Default to $19.00
          
          // Insert placeholder price
          const { error: insertPlaceholderError } = await supabase
            .from('stripe_prices')
            .insert({
              id: priceId,
              stripe_product_id: productId,
              unit_amount: amount,
              currency: 'usd',
              type: 'recurring',
              recurring_interval: 'month',
              active: true,
              created_at: new Date(),
              updated_at: new Date()
            });
          
          if (insertPlaceholderError) {
            console.error(`Error inserting placeholder price ${priceId}: ${insertPlaceholderError.message}`);
          } else {
            console.log(`Successfully added placeholder for price ${priceId}`);
          }
        }
      }
    } else {
      console.log('No subscriptions with missing prices found');
    }
    
    console.log('Stripe data synchronization completed successfully');
  } catch (error) {
    console.error('Error synchronizing Stripe data:', error);
    process.exit(1);
  }
}

// Run the sync function
syncStripeData(); 