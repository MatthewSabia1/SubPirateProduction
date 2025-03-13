import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Initialize Supabase client for database operations
// Initialize Supabase client for database operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables before creating client
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
}

// Create client only if we have credentials
const supabase = supabaseUrl && supabaseServiceKey ? 
  createClient<Database>(supabaseUrl, supabaseServiceKey) : 
  null;

// Determine if we're in production mode based on environment and domain
const isProductionBuild = import.meta.env.PROD === true;
const isDevelopmentHost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

// Only enforce subscriptions on the actual production domain AND in a production build
const isProduction = isProductionBuild && !isDevelopmentHost;

/**
 * Enum for subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  FREE = 'free',
  NONE = 'none'
}

/**
 * Type for subscription data
 */
export type SubscriptionData = {
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
};

/**
 * Default free subscription
 */
const FREE_SUBSCRIPTION: SubscriptionData = {
  status: SubscriptionStatus.FREE,
  planId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  features: ['basic_access'] // Define what features are available in free tier
};

/**
 * Interface for subscription query result
 */
interface SubscriptionQueryResult {
  status: string;
  stripe_price_id: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  stripe_prices: {
    stripe_product_id: string;
  } | null;
}

/**
 * Check if a user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  // In development or preview environments, always return true
  if (!isProduction) {
    console.log('Subscription check bypassed in development environment');
    return true;
  }

  // First check if user is an admin - admins always have active subscriptions
  try {
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: userId });
    
    if (!adminError && isAdmin) {
      console.log('Subscription check bypassed for admin user');
      return true;
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Continue with normal subscription check if admin check fails
  }

  // In production, check for actual subscription
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing']) // Consider both active and trialing as valid
      .maybeSingle();

    if (error) {
      console.error('Error checking subscription status:', error.message);
      return false;
    }

    return !!subscription;
  } catch (error) {
    console.error('Exception checking subscription status:', error);
    return false;
  }
}

/**
 * Get detailed subscription data for a user
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData> {
  // In development or preview environments, return mock subscription data
  if (!isProduction) {
    // For development, we can either return a mock premium subscription
    // or simply return the free tier
    console.log('Using mock subscription data in development environment');
    return {
      status: SubscriptionStatus.ACTIVE,
      planId: 'mock_premium_plan',
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      cancelAtPeriodEnd: false,
      features: ['basic_access', 'premium_feature_1', 'premium_feature_2', 'premium_feature_3']
    };
  }

  // Check if user is an admin - admins get special unlimited subscription
  try {
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: userId });
    
    if (!adminError && isAdmin) {
      console.log(`Special admin subscription returned for user ${userId}`);
      // Return a special admin subscription with all features
      return {
        status: SubscriptionStatus.ACTIVE,
        planId: 'admin_plan',
        currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now (just a placeholder)
        cancelAtPeriodEnd: false,
        features: Object.values(FEATURES) // Include all features
      };
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Continue with normal subscription check if admin check fails
  }

  // In production, fetch actual subscription data
  try {
    // First check if user has a subscription
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        status,
        stripe_price_id,
        current_period_end,
        cancel_at_period_end,
        stripe_prices:stripe_price_id(stripe_product_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log(`No subscription found for user ${userId}`);
      return FREE_SUBSCRIPTION;
    }

    // Cast the response to our interface
    const subscription = data as unknown as SubscriptionQueryResult;
    
    // Extract the product ID safely
    let productId: string | null = null;
    if (subscription.stripe_prices) {
      productId = subscription.stripe_prices.stripe_product_id;
    }
    
    let features: string[] = ['basic_access']; // Always include basic access

    if (productId) {
      const { data: productFeatures, error: featuresError } = await supabase
        .from('product_features')
        .select('feature_key')
        .eq('stripe_product_id', productId);

      if (!featuresError && productFeatures && productFeatures.length > 0) {
        // Add the feature keys to our list
        features = [
          ...features,
          ...productFeatures.map(pf => pf.feature_key)
        ];
      }
    }

    // Convert the subscription status to our enum type
    const status = subscription.status as SubscriptionStatus;
    
    return {
      status,
      planId: subscription.stripe_price_id,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      features
    };
  } catch (error) {
    console.error('Exception getting subscription data:', error);
    return FREE_SUBSCRIPTION;
  }
}

/**
 * Check if a user has access to a specific feature
 */
export async function hasFeatureAccess(userId: string, featureId: string): Promise<boolean> {
  // In development or preview environments, always grant access
  if (!isProduction) {
    console.log(`Feature access check for ${featureId} bypassed in development environment`);
    return true;
  }

  // First check if user is an admin - admins have access to all features
  try {
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: userId });
    
    if (!adminError && isAdmin) {
      console.log(`Feature access check for ${featureId} bypassed for admin user`);
      return true;
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Continue with normal feature check if admin check fails
  }

  try {
    const subscription = await getUserSubscription(userId);
    return subscription.features.includes(featureId);
  } catch (error) {
    console.error(`Error checking feature access for ${featureId}:`, error);
    return false;
  }
}

/**
 * List of supported features in the application
 */
export const FEATURES = {
  BASIC_ACCESS: 'basic_access',
  UNLIMITED_SEARCHES: 'unlimited_searches',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_REPORTS: 'custom_reports',
  // Add more features as needed
};

export async function getSubscriptionStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select('status, stripe_price_id, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing']) // Consider both active and trialing as valid
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception checking subscription status:', error);
    return null;
  }
}

export async function getSubscriptionByCustomerId(customerId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription by customer ID:', error);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Error in getSubscriptionByCustomerId:', error);
    return null;
  }
}

export async function getSubscriptionBySubscriptionId(subscriptionId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription by subscription ID:', error);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Error in getSubscriptionBySubscriptionId:', error);
    return null;
  }
} 