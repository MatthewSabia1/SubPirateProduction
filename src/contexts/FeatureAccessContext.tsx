import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  FeatureKey, 
  getTierFromProductName, 
  TIER_FEATURES, 
  isWithinUsageLimit,
} from '../lib/subscription/features';

interface FeatureAccessContextType {
  hasAccess: (featureKey: FeatureKey) => boolean;
  isLoading: boolean;
  tier: string;
  refreshAccess: () => Promise<void>;
  checkUsageLimit: (metric: string, currentUsage: number) => boolean;
  isAdmin: boolean;
  isGiftUser: boolean;
}

// Define the shape of the data we expect from Supabase
interface StripeProduct {
  name: string;
  stripe_product_id: string;
}

interface PriceWithProduct {
  stripe_products: StripeProduct;
}

// Special tier identifiers
const ADMIN_TIER = 'admin';
const GIFT_TIER = 'gift';

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tier, setTier] = useState<string>('free');
  const [features, setFeatures] = useState<string[]>([]);
  const [usageLimits, setUsageLimits] = useState<Record<string, number>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isGiftUser, setIsGiftUser] = useState<boolean>(false);

  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('is_admin', { user_id: userId });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Exception checking admin status:', error);
      return false;
    }
  }, []);

  const checkGiftStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('is_gift_user', { user_id: userId });
      
      if (error) {
        console.error('Error checking gift user status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Exception checking gift user status:', error);
      return false;
    }
  }, []);

  const loadSubscriptionData = useCallback(async () => {
    if (!user) {
      setTier('free');
      setFeatures(TIER_FEATURES.free);
      setIsAdmin(false);
      setIsGiftUser(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // First check if user is admin
      const adminStatus = await checkAdminStatus(user.id);
      setIsAdmin(adminStatus);
      
      // Then check if user has a gift account
      const giftStatus = await checkGiftStatus(user.id);
      setIsGiftUser(giftStatus);
      
      // If user is admin, they get all features
      if (adminStatus) {
        // Set to admin tier and give access to all features
        setTier(ADMIN_TIER);
        // Combine all features from all tiers
        const allFeatures = Object.values(TIER_FEATURES).flat();
        // Remove duplicates
        setFeatures([...new Set(allFeatures)]);
        setIsLoading(false);
        return;
      }

      // If user has a gift account, they get gift tier features
      if (giftStatus) {
        setTier(GIFT_TIER);
        setFeatures(TIER_FEATURES.gift);
        setIsLoading(false);
        return;
      }

      // For regular users, proceed with normal subscription check
      // Simplified query to avoid 406 error
      const { data: subscription, error: subscriptionError } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscriptionError || !subscription) {
        console.log('No active subscription found');
        setTier('free');
        setFeatures(TIER_FEATURES.free);
        setIsLoading(false);
        return;
      }

      // Check if subscription is active
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        console.log('Subscription is not active:', subscription.status);
        setTier('free');
        setFeatures(TIER_FEATURES.free);
        setIsLoading(false);
        return;
      }

      // Get the product info from the price
      const { data: price, error: priceError } = await supabase
        .from('stripe_prices')
        .select(`
          stripe_products (
            name,
            stripe_product_id
          )
        `)
        .eq('id', subscription.stripe_price_id)
        .maybeSingle();

      if (priceError) {
        console.error('Error fetching price data:', priceError);
        console.log('Missing price ID:', subscription.stripe_price_id);
        setTier('free');
        setFeatures(TIER_FEATURES.free);
        setIsLoading(false);
        return;
      }

      // If price not found, log details and fall back to free tier
      if (!price || !price.stripe_products) {
        console.log(`Price ID ${subscription.stripe_price_id} not found in database. User will default to free tier.`);
        setTier('free');
        setFeatures(TIER_FEATURES.free);
        setIsLoading(false);
        return;
      }

      // Cast the price to our interface to ensure TypeScript knows the shape
      const typedPrice = price as unknown as PriceWithProduct;
      
      // Get the product name and determine tier
      const productName = typedPrice.stripe_products.name;
      const currentTier = getTierFromProductName(productName);
      
      // Set the tier and available features
      setTier(currentTier);
      setFeatures(TIER_FEATURES[currentTier]);

      // Get current usage stats for the user
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_user_usage_stats', { user_id_param: user.id });

      if (!usageError && usageData) {
        setUsageLimits(usageData);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setTier('free');
      setFeatures(TIER_FEATURES.free);
    } finally {
      setIsLoading(false);
    }
  }, [user, checkAdminStatus, checkGiftStatus]);

  // Load subscription data on component mount or when user changes
  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Function to check if user has access to a feature
  const hasAccess = useCallback((featureKey: FeatureKey): boolean => {
    // Admins always have access to all features
    if (isAdmin) {
      return true;
    }
    return features.includes(featureKey);
  }, [features, isAdmin]);

  // Function to check if user is within usage limits
  const checkUsageLimit = useCallback((metric: string, currentUsage: number): boolean => {
    // Usage limits are defined per tier
    return isWithinUsageLimit(tier as any, metric, currentUsage);
  }, [tier]);

  return (
    <FeatureAccessContext.Provider value={{
      hasAccess,
      isLoading,
      tier,
      refreshAccess: loadSubscriptionData,
      checkUsageLimit,
      isAdmin,
      isGiftUser,
    }}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (context === undefined) {
    throw new Error('useFeatureAccess must be used within a FeatureAccessProvider');
  }
  return context;
} 