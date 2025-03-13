// Script to fix product and price IDs in database
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the path to the .env.production file
const envPath = resolve(__dirname, '..', '.env.production');

// Check if the file exists
if (!fs.existsSync(envPath)) {
  console.error(`Environment file not found: ${envPath}`);
  process.exit(1);
}

// Load environment variables
const env = dotenv.config({ path: envPath });

if (env.error) {
  console.error(`Error loading environment variables: ${env.error.message}`);
  process.exit(1);
}

// Log loaded environment variables for debugging (redacted)
console.log('Environment loaded from:', envPath);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Found' : 'Missing');

// Initialize Stripe with production key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not defined in environment');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase credentials are not defined in environment');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Hard-coded product IDs from code vs. actual production IDs
const PRODUCT_ID_MAPPING = {
  // Old test IDs from your codebase
  'prod_RpekF2EAu1npzb': 'prod_RpeI6jwcgu6H8w', // Starter
  'prod_RpekhttqS8GKpE': 'prod_RpeDP1ClkYl7nH', // Creator
  'prod_RpekrPRCVGOqJM': 'prod_RpeErBzCSyArMr', // Pro
  'prod_Rpek1uw0yBJmLG': 'prod_RpeE3bsaw2nQ7N', // Agency
};

// Hard-coded price IDs from code vs. actual production IDs
const PRICE_ID_MAPPING = {
  // Old test price IDs (fallbacks in your code)
  'price_1QvzQXCtsTY6FiiZniXOiFkM': 'price_1Qvz1UCtsTY6FiiZTyGPNs1F', // Starter
  'price_1QvzQlCtsTY6FiiZdZlSfPJc': 'price_1Qvz3GCtsTY6FiiZtiU2XiAq', // Creator
  'price_1QvzQyCtsTY6FiiZD1DOaPJi': 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk', // Pro
  'price_1QvzRBCtsTY6FiiZEtKt3SYA': 'price_1Qvz27CtsTY6FiiZYbT6acEB', // Agency
};

async function fixProductIds() {
  try {
    console.log('Starting product ID correction...');

    // 1. First update the stripe_products table
    const { data: products, error: productsError } = await supabase
      .from('stripe_products')
      .select('*');

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    console.log(`Found ${products.length} products to check`);

    for (const product of products) {
      const testProductId = product.stripe_product_id;
      
      // Check if this product ID needs to be updated
      if (PRODUCT_ID_MAPPING[testProductId]) {
        const prodProductId = PRODUCT_ID_MAPPING[testProductId];
        
        console.log(`Updating product ID from ${testProductId} to ${prodProductId}`);
        
        // Update the product record with the production ID
        const { error: updateError } = await supabase
          .from('stripe_products')
          .update({ stripe_product_id: prodProductId })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`Error updating product ${product.id}: ${updateError.message}`);
        } else {
          console.log(`Successfully updated product ${product.id}`);
        }
      } else {
        console.log(`Product ID ${testProductId} does not need updating`);
      }
    }

    // 2. Now update any price IDs in stripe_prices table
    const { data: prices, error: pricesError } = await supabase
      .from('stripe_prices')
      .select('*');

    if (pricesError) {
      throw new Error(`Error fetching prices: ${pricesError.message}`);
    }

    console.log(`Found ${prices.length} prices to check`);

    for (const price of prices) {
      const testPriceId = price.id;
      
      // Check if this price ID needs to be updated
      if (PRICE_ID_MAPPING[testPriceId]) {
        const prodPriceId = PRICE_ID_MAPPING[testPriceId];
        
        console.log(`Updating price ID from ${testPriceId} to ${prodPriceId}`);
        
        // Since the price ID is the primary key, we need to:
        // 1. Create a new record with the updated ID
        // 2. Delete the old record

        // First, create a new record with the production price ID
        const newPrice = {
          ...price,
          id: prodPriceId
        };
        
        // If the product ID also needs updating
        if (PRODUCT_ID_MAPPING[price.stripe_product_id]) {
          newPrice.stripe_product_id = PRODUCT_ID_MAPPING[price.stripe_product_id];
        }
        
        const { error: insertError } = await supabase
          .from('stripe_prices')
          .insert(newPrice);
        
        if (insertError) {
          // If the error is a duplicate key constraint, the production price may already exist
          if (insertError.code === '23505') {
            console.log(`Production price ${prodPriceId} already exists in database. Skipping insertion.`);
          } else {
            console.error(`Error creating new price record: ${insertError.message}`);
            continue;
          }
        } else {
          console.log(`Successfully created new price record with ID ${prodPriceId}`);
        }
        
        // Now delete the old price record
        const { error: deleteError } = await supabase
          .from('stripe_prices')
          .delete()
          .eq('id', testPriceId);
        
        if (deleteError) {
          console.error(`Error deleting old price record ${testPriceId}: ${deleteError.message}`);
        } else {
          console.log(`Successfully deleted old price record ${testPriceId}`);
        }
      } else {
        console.log(`Price ID ${testPriceId} does not need updating or is already a production ID`);
      }
    }

    // 3. Update the pricing constants in code
    console.log('Please also update the hardcoded product and price IDs in your code:');
    console.log('src/pages/Pricing.tsx and src/pages/LandingPage.tsx');
    console.log('Product ID Map should be:');
    console.log(JSON.stringify({
      Starter: 'prod_RpeI6jwcgu6H8w',
      Creator: 'prod_RpeDP1ClkYl7nH',
      Pro: 'prod_RpeErBzCSyArMr',
      Agency: 'prod_RpeE3bsaw2nQ7N'
    }, null, 2));
    
    console.log('Price fallbacks should be:');
    console.log(JSON.stringify({
      Starter: 'price_1Qvz1UCtsTY6FiiZTyGPNs1F',
      Creator: 'price_1Qvz3GCtsTY6FiiZtiU2XiAq',
      Pro: 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk',
      Agency: 'price_1Qvz27CtsTY6FiiZYbT6acEB'
    }, null, 2));

    console.log('Product and price ID correction completed successfully');
  } catch (error) {
    console.error('Error fixing product and price IDs:', error);
  }
}

// Run the fix function
fixProductIds(); 