import Stripe from 'stripe';
import { Database } from '../database.types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables before creating client
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
}

// Create client only if we have credentials
const supabase = supabaseUrl && supabaseServiceKey ? 
  createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }) : 
  null;

// Determine if we're in production mode based on environment and domain
const isProductionBuild = import.meta.env.PROD === true;
const isDevelopmentHost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

// Only use production mode on the actual production domain AND in a production build
const isProduction = isProductionBuild && !isDevelopmentHost;

// Use test mode on localhost even in production builds
let useTestMode = !isProduction;

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  // Force production for known production domains
  if (hostname === 'subpirate.com' || hostname === 'www.subpirate.com' || hostname === 'app.subpirate.com') {
    console.log(`On production domain ${hostname} - forcing PRODUCTION mode`);
    useTestMode = false;
  }
  
  // Log the current mode
  console.log(`Stripe client running in ${useTestMode ? 'TEST' : 'PRODUCTION'} MODE`);
  console.log(`Host: ${hostname}`);
  console.log(`Production build: ${isProductionBuild}`);
}

// Use the appropriate API key based on the environment
const stripeSecretKey = useTestMode 
  ? import.meta.env.VITE_STRIPE_TEST_SECRET_KEY
  : import.meta.env.VITE_STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('No Stripe secret key found! Check your environment variables.');
}

// Initialize Stripe with retry logic on error
function initializeStripe() {
  try {
    console.log('Initializing Stripe client with API version: 2025-02-24.acacia');
    return new Stripe(stripeSecretKey || '', {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      telemetry: false,
      maxNetworkRetries: 3,
    });
  } catch (error) {
    console.error('Failed to initialize Stripe client:', error);
    console.error('This might be due to an invalid API key or connectivity issue.');
    
    // Return a minimal implementation that will throw errors on calls
    return {
      checkout: { sessions: { create: () => { throw new Error('Stripe not properly initialized'); } } },
      customers: { create: () => { throw new Error('Stripe not properly initialized'); } },
      prices: { list: () => { throw new Error('Stripe not properly initialized'); } },
      products: { list: () => { throw new Error('Stripe not properly initialized'); } }
    } as any;
  }
}

export const stripe = initializeStripe();

// Log a masked version of the key being used
console.log(`Using Stripe key: ${stripeSecretKey.substring(0, 7)}...${stripeSecretKey.substring(stripeSecretKey.length - 4)}`);
console.log(`Running on domain: ${typeof window !== 'undefined' ? window.location.hostname : 'server'}`);

// Helper type for Stripe Product with expanded price data
type StripeProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price;
};

// Helper function to get or create a customer for a user
async function getOrCreateCustomerForUser(userId: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // First check if the user already has a customer ID in our database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    // Log Supabase errors for debugging but continue execution
    if (error) {
      console.error(`Supabase error fetching customer profile: ${error.message}`, error);
      // Continue execution - we'll create a new customer if needed
    }
    
    if (profile?.stripe_customer_id) {
      console.log(`Found existing Stripe customer for user ${userId}: ${profile.stripe_customer_id}`);
      
      try {
        // Verify the customer exists in the current environment
        await stripe.customers.retrieve(profile.stripe_customer_id);
        return profile.stripe_customer_id;
      } catch (customerError: any) {
        // If there's an environment mismatch or the customer doesn't exist
        if (customerError.message && 
           (customerError.message.includes('live mode') || 
            customerError.message.includes('test mode') ||
            customerError.message.includes('No such customer'))) {
          
          console.warn(`Customer ID ${profile.stripe_customer_id} exists in a different environment. Creating a new one.`);
          
          // Clear the invalid customer ID from the database
          const { error: clearError } = await supabase
            .from('profiles')
            .update({ stripe_customer_id: null })
            .eq('id', userId);
            
          if (clearError) {
            console.warn('Failed to clear invalid customer ID from database:', clearError);
          }
          
          // Continue to create a new customer below
        } else {
          // Re-throw unexpected errors
          throw customerError;
        }
      }
    }
    
    // If no customer ID, fetch user details to create one
    let email = undefined;
    let name = undefined;
    
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error(`Supabase error fetching user details: ${userError.message}`, userError);
      } else {
        email = user?.email;
        name = user?.full_name;
      }
    } catch (userFetchError) {
      console.error('Exception fetching user details from Supabase:', userFetchError);
    }
    
    // Handle the case where we can't get user email from Supabase
    if (!email) {
      console.warn(`No email found in Supabase for user ${userId}. Using placeholder email.`);
      // Use a placeholder email based on the user ID
      email = `user-${userId.substring(0, 8)}@example.com`;
      name = `User ${userId.substring(0, 8)}`;
    }
    
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name || email.split('@')[0],
      metadata: { user_id: userId }
    });
    
    console.log(`Created new Stripe customer for user ${userId}: ${customer.id}`);
    
    // Try to update the user profile with the new customer ID
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
        
      if (updateError) {
        console.warn('Supabase error updating user profile with Stripe customer ID:', updateError);
      }
    } catch (updateError) {
      // Log but don't fail if we can't update Supabase
      console.warn('Exception updating user profile with Stripe customer ID:', updateError);
    }
    
    return customer.id;
  } catch (error) {
    console.error('Error getting/creating Stripe customer:', error);
    throw error;
  }
}

// Helper functions for Stripe operations
export async function getActiveProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });
  return products.data;
}

export async function getActivePrices() {
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
  });
  return prices.data;
}

export async function createCustomer(params: {
  email: string;
  name: string;
}) {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
  });
}

export type CheckoutOptions = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId?: string;
};

export async function createCheckoutSession({ priceId, successUrl, cancelUrl, userId }: CheckoutOptions) {
  console.log('Creating checkout session with params:', { 
    priceId, 
    successUrl, 
    cancelUrl, 
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
    testMode: useTestMode
  });

  // Create session object
  const sessionParams: any = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
    client_reference_id: userId, // Add user ID as client reference
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
    customer_update: {
      name: 'auto',
      address: 'auto', // Also allow updating address
    },
  };

  // Add customer parameter for subscription mode
  if (userId) {
    // Add metadata directly to the session
    sessionParams.metadata = {
      user_id: userId
    };
    
    // Use proper metadata format for subscription data
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      metadata: {
        user_id: userId
      }
    };
    
    try {
      // Add customer parameter for subscription mode
      const customerId = await getOrCreateCustomerForUser(userId);
      if (customerId) {
        sessionParams.customer = customerId;
      } else {
        // If no customer ID was returned, don't include the customer_update parameter
        delete sessionParams.customer_update;
      }
    } catch (customerError: any) {
      console.error('Failed to get or create customer:', customerError);
      
      // If we get a test/live mode mismatch error, continue without customer ID
      // Stripe will create a new customer during checkout
      if (customerError.message && 
         (customerError.message.includes('live mode') || 
          customerError.message.includes('test mode'))) {
        console.warn('Detected test/live mode mismatch. Continuing without customer ID.');
        delete sessionParams.customer_update;
        
        // Add diagnostic information
        console.error('Stripe mode mismatch detected:', {
          useTestMode,
          keyPrefix: stripeSecretKey.substring(0, 8)
        });
      }
    }
  } else {
    // If no userId provided, don't use customer_update
    delete sessionParams.customer_update;
  }

  try {
    console.log('Creating Stripe checkout session with parameters:', JSON.stringify({
      ...sessionParams,
      customer: sessionParams.customer ? 'REDACTED' : undefined
    }, null, 2));
    
    // Validate price exists and is in the correct mode
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price || !price.active) {
        throw new Error(`Price ${priceId} is not active or does not exist`);
      }
      console.log(`Verified price ${priceId} exists and is active`);
    } catch (priceError: any) {
      console.error('Error validating price:', priceError.message);
      
      if (priceError.message && 
         (priceError.message.includes('live mode') || 
          priceError.message.includes('test mode'))) {
        // This is a mode mismatch - create a more descriptive error
        throw new Error('This plan is not available in the current environment. Please contact support.');
      }
      
      throw new Error(`Invalid price ID: ${priceError.message}`);
    }
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }
    
    console.log('Successfully created checkout session:', { 
      id: session.id,
      url: session.url.substring(0, 60) + '...' 
    });
    
    return session;
  } catch (error: any) {
    console.error('Stripe checkout session creation failed:');
    console.error('Error message:', error.message);
    
    // If it's a Stripe error, log more details
    if (error.type && error.code) {
      console.error('Stripe error type:', error.type);
      console.error('Stripe error code:', error.code);
      console.error('Stripe error param:', error.param);
    }
    
    // Check for specific error cases and provide helpful messages
    if (error.message && error.message.includes('test mode') && error.message.includes('live mode')) {
      console.error('Test/Live mode mismatch detected! Current mode:', useTestMode ? 'TEST' : 'PRODUCTION');
      
      // Try to retry without customer ID if it's a mode mismatch
      if (sessionParams.customer) {
        console.log('Attempting recovery - creating session without customer ID');
        delete sessionParams.customer;
        delete sessionParams.customer_update;
        
        try {
          const recoverySession = await stripe.checkout.sessions.create(sessionParams);
          if (recoverySession.url) {
            console.log('Recovery successful - created session without customer ID');
            return recoverySession;
          }
        } catch (recoveryError) {
          console.error('Recovery attempt failed:', recoveryError);
        }
      }
      
      throw new Error('There was a configuration error with the payment system. Please try again later or contact support.');
    }
    
    throw error;
  }
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

// Type guard for Stripe webhook events
export function isValidStripeWebhookEvent(
  event: any
): event is Stripe.Event {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.type === 'string' &&
    typeof event.id === 'string' &&
    typeof event.object === 'string' &&
    event.object === 'event'
  );
}

// Get features for a specific product from the database
export async function getProductFeatures(productId: string) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    if (!productId) {
      console.error('Empty product ID passed to getProductFeatures');
      return [];
    }
    
    console.log(`Fetching features for product ID: ${productId}`);
    
    // First fetch feature records from product_features table
    const { data: productFeatures, error: featuresError } = await supabase
      .from('product_features')
      .select(`
        id,
        stripe_product_id,
        feature_key,
        enabled,
        subscription_features:feature_key(
          name,
          description
        )
      `)
      .eq('stripe_product_id', productId)
      .eq('enabled', true);
    
    if (featuresError) {
      console.error(`Error fetching product features for product ${productId}:`, featuresError);
      return [];
    }
    
    if (!productFeatures || productFeatures.length === 0) {
      console.warn(`No features found for product ${productId}`);
      return [];
    }
    
    // For debugging - log feature count and name
    console.log(`Found ${productFeatures.length} features for product ${productId}`);
    
    // Format the features for frontend display
    return productFeatures.map(feature => {
      // Access subscription feature data safely
      const featureData = feature.subscription_features as unknown as { 
        name?: string; 
        description?: string;
      } | null;
      
      return {
        id: feature.id,
        key: feature.feature_key,
        name: featureData?.name || feature.feature_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: featureData?.description || '',
        enabled: feature.enabled
      };
    });
  } catch (error) {
    console.error(`Error in getProductFeatures for product ${productId}:`, error);
    return [];
  }
}

// Get all defined features from the database
export async function getAllFeatures() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    const { data: features, error: featuresError } = await supabase
      .from('subscription_features')
      .select('*');
      
    if (featuresError) {
      console.error('Error fetching features:', featuresError);
      return [];
    }
    
    return features;
  } catch (error) {
    console.error('Error fetching all features:', error);
    return [];
  }
}

export async function getAvailablePlans() {
  try {
    const products = await getActiveProducts();
    const prices = await getActivePrices();

    // Map prices to products
    const plans = products.map(product => {
      const productPrices = prices.filter(price => price.product === product.id);
      return {
        product,
        prices: productPrices
      };
    });

    return plans;
  } catch (error) {
    console.error('Error getting available plans:', error);
    throw error;
  }
}