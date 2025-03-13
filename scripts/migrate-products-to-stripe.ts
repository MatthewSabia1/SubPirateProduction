// This script migrates product and feature data from the database to Stripe
// with proper metadata that the webhook handler can use to sync back

import { stripe } from '../src/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load the appropriate .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`Loading environment from ${envFile}`);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check Stripe API key
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeKey) {
  console.error('Missing Stripe API key. Please check your .env file.');
  process.exit(1);
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface Feature {
  feature_key: string;
  name: string;
  description: string;
}

interface ProductFeature {
  stripe_product_id: string;
  feature_key: string;
  enabled: boolean;
  metadata?: { limit: number | null } | null;
}

async function migrateProducts() {
  try {
    console.log('Fetching products from database...');
    
    // Get products from database
    const { data: products, error: productsError } = await supabase
      .from('stripe_products')
      .select('*');
      
    if (productsError || !products) {
      throw new Error(`Error fetching products: ${productsError?.message}`);
    }
    
    console.log(`Found ${products.length} products in database`);
    
    // Get all features
    const { data: features, error: featuresError } = await supabase
      .from('subscription_features')
      .select('*');
      
    if (featuresError || !features) {
      throw new Error(`Error fetching features: ${featuresError?.message}`);
    }
    
    console.log(`Found ${features.length} features in database`);
    
    // Get product features
    const { data: productFeatures, error: productFeaturesError } = await supabase
      .from('product_features')
      .select('*');
      
    if (productFeaturesError || !productFeatures) {
      throw new Error(`Error fetching product features: ${productFeaturesError?.message}`);
    }
    
    console.log(`Found ${productFeatures.length} product features mappings in database`);
    
    // For each product, create or update in Stripe with metadata
    for (const product of products) {
      console.log(`Processing product: ${product.name} (${product.stripe_product_id})`);
      
      // Get features for this product
      const featuresForProduct = productFeatures.filter(
        pf => pf.stripe_product_id === product.stripe_product_id
      );
      
      console.log(`  Found ${featuresForProduct.length} features for this product`);
      
      // Create metadata for features
      const metadata: Record<string, string> = {};
      
      featuresForProduct.forEach(pf => {
        // Find full feature details
        const featureDetails = features.find(f => f.feature_key === pf.feature_key);
        
        if (featureDetails) {
          // Add enabled flag to metadata
          metadata[`feature_${pf.feature_key}`] = pf.enabled.toString();
          
          // If there's a limit in the metadata, add it
          if (pf.metadata && typeof pf.metadata === 'object' && pf.metadata !== null && 'limit' in pf.metadata) {
            const limit = pf.metadata.limit;
            if (limit !== null) {
              metadata[`feature_limit_${pf.feature_key}`] = limit.toString();
            }
          }
        }
      });
      
      // Add product description to metadata if available
      if (product.description) {
        metadata.description = product.description;
      }
      
      try {
        // Check if product exists in Stripe
        try {
          const existingProduct = await stripe.products.retrieve(product.stripe_product_id);
          
          console.log(`  Updating existing product in Stripe: ${existingProduct.id}`);
          
          // Update existing product
          await stripe.products.update(product.stripe_product_id, {
            name: product.name,
            description: product.description || undefined,
            active: product.active,
            metadata
          });
        } catch (err) {
          // Product doesn't exist, create it
          console.log(`  Creating new product in Stripe with ID: ${product.stripe_product_id}`);
          
          await stripe.products.create({
            id: product.stripe_product_id,
            name: product.name,
            description: product.description || undefined,
            active: product.active,
            metadata
          });
        }
        
        console.log(`  ✅ Product ${product.name} updated/created in Stripe`);
      } catch (err) {
        console.error(`  ❌ Error with product ${product.name}:`, err);
      }
    }
    
    console.log('\nProduct migration completed successfully!');
    
    // Now fetch prices from the database and create/update them in Stripe
    console.log('\nFetching prices from database...');
    
    const { data: prices, error: pricesError } = await supabase
      .from('stripe_prices')
      .select('*');
      
    if (pricesError || !prices) {
      throw new Error(`Error fetching prices: ${pricesError?.message}`);
    }
    
    console.log(`Found ${prices.length} prices in database`);
    
    for (const price of prices) {
      console.log(`Processing price: ${price.id} for product ${price.product_id}`);
      
      try {
        // Check if price exists in Stripe
        try {
          const existingPrice = await stripe.prices.retrieve(price.id);
          console.log(`  Price already exists in Stripe: ${existingPrice.id}`);
          
          // Prices are immutable in Stripe, so we can only update metadata or active status
          await stripe.prices.update(price.id, {
            active: price.active
          });
        } catch (err) {
          // Price doesn't exist, create it
          console.log(`  Creating new price in Stripe with ID: ${price.id}`);
          
          await stripe.prices.create({
            product: price.product_id,
            unit_amount: price.unit_amount,
            currency: price.currency || 'usd',
            recurring: price.recurring_interval ? {
              interval: price.recurring_interval as 'day' | 'week' | 'month' | 'year'
            } : undefined,
            active: price.active,
            transfer_lookup_key: true,
            lookup_key: price.id
          });
        }
        
        console.log(`  ✅ Price ${price.id} updated/created in Stripe`);
      } catch (err) {
        console.error(`  ❌ Error with price ${price.id}:`, err);
      }
    }
    
    console.log('\nPrice migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateProducts().then(() => {
  console.log('Migration completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 