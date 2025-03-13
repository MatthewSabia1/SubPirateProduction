import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check } from 'lucide-react';
import { 
  getActiveProducts, 
  getActivePrices, 
  createCheckoutSession,
  getProductFeatures 
} from '../lib/stripe/client';
import type { Stripe } from 'stripe';
import Logo from '../components/Logo';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

// Types from Pricing.tsx
interface ProductFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Map of plan names to their corresponding product IDs - same as in Pricing.tsx
const PRODUCT_ID_MAP = {
  Starter: 'prod_starter',
  Creator: 'prod_creator',
  Pro: 'prod_pro',
  Agency: 'prod_agency'
};

// Fallback features for each plan - used if database features can't be loaded
const FALLBACK_FEATURES = {
  Starter: [
    '<span class="font-bold text-white">Unlimited</span> Subreddit Analysis',
    '<span class="font-bold text-white">Unlimited</span> Spyglass Searches',
    'Up to <span class="font-bold text-white">5</span> Active Projects',
    'Save & Track <span class="font-bold text-white">25</span> Subreddits',
    'Connect Up To <span class="font-bold text-white">3</span> Reddit Accounts',
    '<span class="font-bold text-white">Real Time</span> Data Tracking',
    'Access to <span class="font-bold text-white">Deep Analytics</span>',
    'Access to <span class="font-bold text-white">Calendar Tool</span>',
    '<span class="font-bold text-white">24/7</span> Support'
  ],
  Creator: [
    '<span class="font-bold text-white">Unlimited</span> Subreddit Analysis',
    '<span class="font-bold text-white">Unlimited</span> Spyglass Searches',
    'Up to <span class="font-bold text-white">10</span> Active Projects',
    'Save & Track <span class="font-bold text-white">50</span> Subreddits',
    'Connect Up To <span class="font-bold text-white">10</span> Reddit Accounts',
    '<span class="font-bold text-white">Real Time</span> Data Tracking',
    'Access to <span class="font-bold text-white">Deep Analytics</span>',
    'Access to <span class="font-bold text-white">Calendar Tool</span>',
    '<span class="font-bold text-white">24/7 Priority</span> Support'
  ],
  Pro: [
    '<span class="font-bold text-white">Unlimited</span> Subreddit Analysis',
    '<span class="font-bold text-white">Unlimited</span> Spyglass Searches',
    'Up to <span class="font-bold text-white">Unlimited</span> Active Projects',
    'Save & Track <span class="font-bold text-white">250</span> Subreddits',
    'Connect Up To <span class="font-bold text-white">25</span> Reddit Accounts',
    '<span class="font-bold text-white">Real Time</span> Data Tracking',
    'Access to <span class="font-bold text-white">Deep Analytics</span>',
    'Access to <span class="font-bold text-white">Calendar Tool</span>',
    '<span class="font-bold text-white">Early Access</span> to Auto Poster',
    '<span class="font-bold text-white">24/7 Priority</span> Support'
  ],
  Agency: [
    '<span class="font-bold text-white">Unlimited</span> Subreddit Analysis',
    '<span class="font-bold text-white">Unlimited</span> Spyglass Searches',
    'Up to <span class="font-bold text-white">Unlimited</span> Active Projects',
    'Save & Track <span class="font-bold text-white">500</span> Subreddits',
    'Connect Up To <span class="font-bold text-white">100</span> Reddit Accounts',
    '<span class="font-bold text-white">Real Time</span> Data Tracking',
    'Access to <span class="font-bold text-white">Deep Analytics</span>',
    'Access to <span class="font-bold text-white">Calendar Tool</span>',
    '<span class="font-bold text-white">Early Access</span> to Auto Poster',
    '<span class="font-bold text-white">Dedicated</span> Account Manager',
    '<span class="font-bold text-white">24/7 Personalized</span> Support'
  ],
};

// Default descriptions in case database fails
const DEFAULT_DESCRIPTIONS = {
  Starter: 'Essential features for getting started with Reddit marketing',
  Creator: 'Perfect for content creators and growing brands',
  Pro: 'Advanced features for professional marketers',
  Agency: 'Perfect for content creators and growing brands'
};

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Stripe.Product[]>([]);
  const [prices, setPrices] = useState<Stripe.Price[]>([]);
  const [productFeatures, setProductFeatures] = useState<Record<string, ProductFeature[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if user coming from successful checkout - IMPORTANT for post-checkout flow
  // Using both window.location and URLSearchParams for redundancy
  const urlParams = new URLSearchParams(window.location.search);
  const urlCheckoutSuccess = 
    urlParams.get('checkout') === 'success' || 
    window.location.search.includes('checkout=success');
  
  // Also check localStorage for persisted checkout success
  const persistedCheckoutSuccess = localStorage.getItem('checkout_success') === 'true';
  const persistedTimestamp = localStorage.getItem('checkout_success_time');
  
  // Use either URL or localStorage checkout success
  const isCheckoutSuccess = urlCheckoutSuccess || persistedCheckoutSuccess;

  // Add debug log to confirm checkout parameter
  useEffect(() => {
    console.log('SubscriptionPage: Checkout success check:', { 
      rawSearch: window.location.search,
      urlCheckoutSuccess,
      persistedCheckoutSuccess,
      persistedTimestamp,
      isCheckoutSuccess 
    });
    
    // If we detect checkout success from URL, persist it in localStorage
    if (urlCheckoutSuccess) {
      console.log('SubscriptionPage: Storing checkout success in localStorage from URL param');
      localStorage.setItem('checkout_success', 'true');
      localStorage.setItem('checkout_success_time', new Date().toISOString());
    }
  }, [urlCheckoutSuccess, persistedCheckoutSuccess, isCheckoutSuccess]);

  // Get state passed from navigation
  const state = location.state as { newUser?: boolean } | null;
  const isNewUser = state?.newUser === true;

  useEffect(() => {
    console.log("SubscriptionPage: Component mounted");
    console.log("SubscriptionPage: isNewUser =", isNewUser);
    console.log("SubscriptionPage: isCheckoutSuccess =", isCheckoutSuccess);
    
    const checkSubscriptionStatus = async () => {
      if (!user) {
        console.log("SubscriptionPage: No user, waiting for auth");
        return;
      }

      console.log("SubscriptionPage: Checking subscription status for user", user.id);
      
      try {
        // Check both URL and localStorage for checkout success
        if (isCheckoutSuccess) {
          console.log("SubscriptionPage: Processing checkout success, skipping checks and navigating to dashboard");
          console.log("SubscriptionPage: Checkout success details:", {
            urlCheckoutSuccess,
            persistedCheckoutSuccess,
            persistedTimestamp
          });
          
          setIsProcessingCheckout(true);
          setHasSubscription(true); // Assume successful subscription
          setLoading(false);
          
          // Immediately navigate to dashboard - we assume success for checkout=success
          navigate('/dashboard', { replace: true });
          return;
        }
        
        // Check subscriptions table for active OR trialing subscriptions
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .or('status.eq.active,status.eq.trialing')
          .maybeSingle();

        if (subscriptionError) {
          console.error("SubscriptionPage: Error checking subscriptions table:", subscriptionError);
        } else {
          console.log("SubscriptionPage: Subscription table result:", subscriptionData);
        }

        // Check customer_subscriptions table for active or trialing subscriptions in a single query
        const { data: validSubscriptions, error: validSubsError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .or('status.eq.active,status.eq.trialing');
          
        if (validSubsError) {
          console.error("SubscriptionPage: Error checking valid subscriptions:", validSubsError);
        } else {
          console.log("SubscriptionPage: Valid customer subscriptions result:", validSubscriptions);
        }

        // Also try to get all customer_subscriptions regardless of status to see what's there
        const { data: allCustomerSubs, error: allCustomerSubsError } = await supabase
          .from('customer_subscriptions')
          .select('*')
          .eq('user_id', user.id);
          
        if (allCustomerSubsError) {
          console.error("SubscriptionPage: Error checking all customer subscriptions:", allCustomerSubsError);
        } else {
          console.log("SubscriptionPage: All customer subscriptions for user:", allCustomerSubs);
        }

        // If user has an active or trialing subscription, redirect to dashboard
        const hasValidSubscription = !!(
          subscriptionData || 
          (validSubscriptions && validSubscriptions.length > 0)
        );
        
        setHasSubscription(hasValidSubscription);
        
        // Only redirect if user has subscription AND this is not a new user flow
        if (hasValidSubscription && !isNewUser) {
          console.log("SubscriptionPage: User has valid subscription and is not marked as new user, redirecting to dashboard");
          navigate('/dashboard', { replace: true });
          return;
        } else if (!hasValidSubscription) {
          console.log("SubscriptionPage: User has no valid subscription, staying on subscription page");
          // Stay on subscription page and show subscription options
        } else {
          console.log("SubscriptionPage: New user flow, staying on subscription page");
          // Stay on subscription page for new user flow
        }
        
        console.log("SubscriptionPage: User needs to select a subscription or is in new user flow");
        setLoading(false);
      } catch (error) {
        console.error("SubscriptionPage: Error checking subscription status:", error);
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkSubscriptionStatus();
    }
  }, [user, authLoading, navigate, isNewUser, isCheckoutSuccess, urlCheckoutSuccess, persistedCheckoutSuccess]);

  // Guard: redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("SubscriptionPage: No authenticated user, redirecting to login");
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch products and prices
  useEffect(() => {
    async function fetchData() {
      // Set loading state to true at the beginning
      setLoading(true);
      
      try {
        // Add debug log
        console.log("SubscriptionPage: Starting to fetch products and prices");
        
        // Check if we're in test mode
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        const testPublishableKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;
        const isTestMode = publishableKey === testPublishableKey;
        setIsTestMode(isTestMode);
        
        console.log("SubscriptionPage: Running in", isTestMode ? "TEST" : "PRODUCTION", "mode");
        
        // Fetch products and prices from Stripe
        let productsData: Stripe.Product[] = [];
        
        try {
          console.log("SubscriptionPage: Fetching products...");
          productsData = await getActiveProducts();
          console.log("SubscriptionPage: Fetched products:", productsData.length);
          setProducts(productsData);
          
          if (productsData.length === 0) {
            console.error("SubscriptionPage: No products were returned from Stripe API");
            setErrorMessage("No subscription plans are currently available. Please try again later.");
          }
        } catch (productError) {
          console.error("SubscriptionPage: Error fetching products:", productError);
          setErrorMessage("Failed to load subscription products. Please try refreshing the page.");
          // Don't return early - still try to fetch prices
        }
        
        try {
          console.log("SubscriptionPage: Fetching prices...");
          const pricesData = await getActivePrices();
          console.log("SubscriptionPage: Fetched prices:", pricesData.length);
          setPrices(pricesData);
          
          if (pricesData.length === 0) {
            console.error("SubscriptionPage: No prices were returned from Stripe API");
            if (!errorMessage) {
              setErrorMessage("No subscription prices are currently available. Please try again later.");
            }
          }
        } catch (priceError) {
          console.error("SubscriptionPage: Error fetching prices:", priceError);
          if (!errorMessage) {
            setErrorMessage("Failed to load subscription prices. Please try refreshing the page.");
          }
        }
        
        // Only fetch features if we have products
        if (productsData.length > 0) {
          try {
            console.log("SubscriptionPage: Fetching features for products");
            const featuresPromises = productsData.map(product => 
              getProductFeatures(product.id).then(features => ({ productId: product.id, features }))
            );
            
            const featuresResults = await Promise.all(featuresPromises);
            
            // Convert array of results to a record object for easy lookup
            const featuresMap: Record<string, ProductFeature[]> = {};
            featuresResults.forEach(result => {
              featuresMap[result.productId] = result.features;
            });
            
            setProductFeatures(featuresMap);
            console.log("SubscriptionPage: Fetched features for", featuresResults.length, "products");
          } catch (featuresError) {
            console.error("SubscriptionPage: Error fetching product features:", featuresError);
            // Don't set error message here, as we have fallback features
          }
        } else {
          console.warn("SubscriptionPage: No products available, skipping feature fetch");
        }
      } catch (err) {
        console.error("SubscriptionPage: Error in fetchData:", err);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch pricing data');
      } finally {
        console.log("SubscriptionPage: Finished loading subscription data");
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading && !errorMessage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {isProcessingCheckout ? 'Processing your subscription...' : 'Loading subscription options...'}
          </h1>
          <LoadingSpinner size={10} />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Error loading subscription data. Please try again later.</div>
      </div>
    );
  }

  // Hard-coded price fallbacks if needed
  const priceFallbacks: Record<string, string> = {
    'Starter': 'price_1Qvz1UCtsTY6FiiZTyGPNs1F',
    'Creator': 'price_1Qvz3GCtsTY6FiiZtiU2XiAq',
    'Pro': 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk',
    'Agency': 'price_1Qvz27CtsTY6FiiZYbT6acEB'
  };

  // Get price for a product with hardcoded fallbacks
  const getFormattedPrice = (planName: string): string => {
    // Hard-coded price display fallbacks if needed
    const priceDisplayFallbacks: Record<string, string> = {
      'Starter': '$19.97',
      'Creator': '$34.97',
      'Pro': '$47.99',
      'Agency': '$197.97'
    };
    
    // Find the product by name
    const product = products.find(p => p.name === planName);
    if (!product) {
      return priceDisplayFallbacks[planName] || '$0.00';
    }
    
    // Get price for the product
    const price = prices.find(p => p.product === product.id);
    if (!price?.unit_amount) {
      return priceDisplayFallbacks[planName] || '$0.00';
    }
    
    // Format price from cents to dollars
    const formattedPrice = (price.unit_amount / 100).toFixed(2);
    return `$${formattedPrice}`;
  };

  // Get product description with fallback
  const getProductDescription = (planName: string): string => {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id; 
    
    if (!productId || !products.length) {
      return DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
    }
    
    return product?.description || 
      DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
  };
  
  // Get features for a plan from the database or use fallbacks
  const getFeatures = (planName: string): string[] => {
    // Always prioritize the fallback features for consistency
    const fallbackFeatures = FALLBACK_FEATURES[planName as keyof typeof FALLBACK_FEATURES];
    
    // If we have fallback features defined, use them
    if (fallbackFeatures && fallbackFeatures.length > 0) {
      return fallbackFeatures;
    }
    
    // Only if we don't have fallbacks, try to use database features
    const product = products.find(p => p.name === planName);
    if (!product) {
      console.log(`Product not found for plan: ${planName}, using empty array`);
      return [];
    }
    
    const productId = product.id;
    const features = productFeatures[productId];
    
    if (!features || features.length === 0) {
      console.log(`No features found for product ID: ${productId}, using empty array`);
      return [];
    }
    
    // Transform database features into formatted HTML strings
    return features.map(feature => {
      // Extract any numeric values from the feature description for highlighting
      const description = feature.description;
      const numberMatch = description.match(/(\d+)/);
      
      if (numberMatch) {
        const number = numberMatch[1];
        // Replace the number with a highlighted version
        return description.replace(
          number, 
          `<span class="font-bold text-white">${number}</span>`
        );
      }
      
      // If no number found, just return the description
      return description;
    });
  };

  // Create a TestModeIndicator component that matches the one in LandingPage.tsx
  const TestModeIndicator = () => (
    <div className="bg-amber-900/20 border border-amber-800 text-amber-200 px-4 py-2 rounded-md text-sm mb-6 max-w-3xl mx-auto text-center">
      <p><span className="font-bold">Test Mode Active:</span> Using Stripe test data. All plans use test prices and features.</p>
    </div>
  );

  async function handleSelectPlan(planName: string) {
    // Initial variable declaration outside try/catch to make it available in catch
    let priceId: string | undefined;
    
    try {
      // Clear any previous errors
      setErrorMessage(null);
      
      // Log to find out what's happening
      console.log('User selected plan:', planName);
      console.log('Number of products loaded:', products.length);
      console.log('Available products:', products.map(p => ({name: p.name, id: p.id})));
      
      // Set loading state for this specific plan
      setLoadingPlan(planName);
      setLoading(true);
      
      // Get the expected product ID from our mapping
      const expectedProductId = PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
      if (!expectedProductId) {
        console.error('No product ID mapping for plan:', planName);
        alert('Invalid plan selected. Please contact support.');
        setLoading(false);
        setLoadingPlan(null);
        return;
      }
      
      console.log('Looking for product with ID:', expectedProductId);
      
      // Find the product with matching ID instead of name
      const product = products.find(p => p.id === expectedProductId);
      
      // Fall back to find by name if ID search fails
      const productByName = !product ? products.find(p => p.name === planName) : null;
      
      if (!product && !productByName) {
        console.error('Could not find product for plan:', planName);
        console.error('Expected product ID:', expectedProductId);
        console.error('Available product IDs:', products.map(p => p.id));
        
        // If we have at least one product, use the first one as a fallback
        if (products.length > 0) {
          console.log('Using first available product as fallback');
          const fallbackProduct = products[0];
          
          // Get price for the fallback product
          const price = prices.find(p => p.product === fallbackProduct.id);
          if (!price) {
            console.error('No price found for fallback product');
            alert('Unable to find price information. Please try again or contact support.');
            setLoading(false);
            setLoadingPlan(null);
            return;
          }
          
          priceId = price.id;
          console.log('Using fallback price ID:', priceId);
        } else {
          alert('Unable to find the selected plan. Please try again or contact support.');
          setLoading(false);
          setLoadingPlan(null);
          return;
        }
      } else {
        const selectedProduct = product || productByName;
        console.log('Found product for plan:', selectedProduct);
        
        const productId = selectedProduct!.id;
        
        if (!productId) {
          console.error('Product has no ID:', selectedProduct);
          alert('Unable to process the selected plan. Please try again or contact support.');
          setLoading(false);
          setLoadingPlan(null);
          return;
        }

        const price = prices.find(p => p.product === productId);
        console.log('Found price for product:', price);
        
        priceId = price?.id || priceFallbacks[planName as keyof typeof priceFallbacks];
      }

      if (!priceId) {
        console.error('No price ID found for the selected plan', {
          planName,
          availableProducts: products.length,
          availablePrices: prices.length
        });
        console.log('Available products:', products);
        console.log('Available prices:', prices);
        
        alert('Price information not found. Please refresh the page and try again.');
        setLoading(false);
        setLoadingPlan(null);
        return;
      }

      if (!user) {
        console.error('User is not authenticated');
        alert('Please sign in to subscribe to a plan.');
        setLoading(false);
        setLoadingPlan(null);
        return;
      }

      console.log('Starting checkout process for:', {
        planName,
        priceId,
        userId: user.id
      });
      
      // Create a success URL with the checkout=success parameter
      // Use the absolute URL to ensure it works correctly in all environments
      const successUrl = new URL('/dashboard', window.location.origin);
      successUrl.searchParams.set('checkout', 'success');
      
      // Log the success URL for debugging
      console.log('Success URL for checkout:', successUrl.toString());
      
      // Create a Stripe checkout session
      const checkoutResult = await createCheckoutSession({
        priceId,
        successUrl: successUrl.toString(),
        cancelUrl: `${window.location.origin}/subscription?checkout=canceled`,
        userId: user.id
      });
      
      if (checkoutResult?.url) {
        // Immediately set checkout success flag in localStorage before redirecting
        // This provides a fallback in case the redirect back from Stripe loses URL params
        localStorage.setItem('checkout_success', 'true');
        localStorage.setItem('checkout_success_time', new Date().toISOString());
        
        // Redirect to the Stripe Checkout page
        console.log('Redirecting to Stripe checkout:', checkoutResult.url);
        window.location.href = checkoutResult.url;
      } else {
        throw new Error('Could not create checkout session - no URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setLoading(false);
      setLoadingPlan(null);
      
      // Try to provide a more helpful error message
      let errorMsg = 'An error occurred while creating your checkout session. Please try again.';
      
      // Check for specific error conditions
      if (error.message) {
        if (error.message.includes('test mode') && error.message.includes('live mode')) {
          errorMsg = 'There was a configuration issue with the payment system. The team has been notified.';
          // Make a special note in the console for debugging
          console.error('CRITICAL: Test/Live mode mismatch detected in Stripe configuration');
        } else if (error.message.includes('Invalid price ID')) {
          errorMsg = 'The selected subscription plan is currently unavailable. Please try a different plan or contact support.';
        } else if (error.message.includes('customer')) {
          errorMsg = 'There was an issue with your customer information. Please try again or contact support.';
        } else if (error.message.includes('No such customer')) {
          errorMsg = 'Your customer profile is not set up correctly. Please contact support.';
        } else if (error.message.includes('checkout')) {
          errorMsg = 'Unable to create checkout session. Please verify you have a valid payment method and try again.';
        }
      }
      
      // Display the error to the user
      setErrorMessage(errorMsg);
      alert(errorMsg);
      
      // Log detailed diagnostic information
      console.log('Checkout diagnostic info:', {
        userAuth: !!user,
        userId: user?.id,
        productCount: products.length,
        priceCount: prices.length,
        selectedPlan: planName,
        selectedPriceId: priceId,
        stripe: {
          mode: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'test' : 'production'
        },
        environmentInfo: typeof window !== 'undefined' ? {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          href: window.location.href
        } : 'not in browser'
      });
    }
  }

  // CSS styles for consistent appearance with Pricing.tsx
  const styles = `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      background-color: rgba(198, 155, 123, 0.1);
      border: 1px solid rgba(198, 155, 123, 0.2);
      color: #C69B7B;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    
    .pricing-card {
      background-color: #0f0f0f;
      border-radius: 1rem;
      padding: 2rem;
      border: 1px solid #222222;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      height: 100%;
    }
    
    .pricing-card:hover {
      border-color: #333333;
      transform: translateY(-4px);
    }
    
    .pricing-card-featured {
      background-color: #0f0f0f;
      border-radius: 1rem;
      padding: 2rem;
      border: 2px solid #C69B7B;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s ease;
      height: 100%;
      box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
    }
    
    .pricing-button {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    
    .button-outline {
      color: #C69B7B;
      border: 1px solid #C69B7B;
    }
    
    .button-outline:hover {
      background-color: #C69B7B;
      color: #000000;
    }
    
    .button-primary {
      background-color: #C69B7B;
      color: #000000;
      box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
    }
    
    .button-primary:hover {
      background-color: #B38A6A;
    }
  `;

  return (
    <div className="min-h-screen bg-black">
      <style>{styles}</style>

      <div className="container mx-auto px-6 py-12">
        <div className="flex justify-center mb-8">
          <Logo size="xl" className="mb-4" />
        </div>

        {isTestMode && <TestModeIndicator />}
        
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-800 text-red-200 px-4 py-3 rounded-md text-sm mb-6 max-w-3xl mx-auto">
            <p><span className="font-bold">Error:</span> {errorMessage}</p>
            <p className="text-xs mt-1">If this issue persists, please contact support.</p>
          </div>
        )}
        
        <div className="text-center mb-16">
          <div className="badge mx-auto mb-3">SUBSCRIPTION REQUIRED</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your <span className="text-[#C69B7B]">Plan</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A subscription is required to use SubPirate. Please select a plan to continue.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3 className="text-xl font-semibold mb-2">Starter</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Starter')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Starter')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Starter').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Starter')} 
              className="pricing-button button-outline"
            >
              Select Starter
            </button>
          </div>

          {/* Creator Plan */}
          <div className="pricing-card-featured">
            <div className="absolute top-0 right-0 bg-[#C69B7B] text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              MOST POPULAR
            </div>
            <h3 className="text-xl font-semibold mb-2">Creator</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Creator')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Creator')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Creator').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Creator')} 
              className="pricing-button button-primary"
            >
              Select Creator
            </button>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card">
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Pro')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Pro')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Pro').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Pro')} 
              className="pricing-button button-outline"
            >
              Select Pro
            </button>
          </div>
        </div>

        {/* Agency Plan - Wide box at the bottom */}
        <div className="max-w-5xl mx-auto">
          <div className="pricing-card border border-gray-800 rounded-lg bg-gray-900/50">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-2">Agency</h3>
                <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Agency')}<span className="text-lg text-gray-400">/mo</span></div>
                <p className="text-gray-400 mb-6">{getProductDescription('Agency')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ul className="space-y-3">
                  {getFeatures('Agency').slice(0, Math.ceil(getFeatures('Agency').length / 2)).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-3">
                  {getFeatures('Agency').slice(Math.ceil(getFeatures('Agency').length / 2)).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => handleSelectPlan('Agency')} 
                className="pricing-button button-outline max-w-xs"
              >
                Select Agency
              </button>
            </div>
          </div>
        </div>

        {/* Add loading overlay if needed */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C69B7B] mx-auto mb-4"></div>
              <p className="text-white">Processing your subscription...</p>
              <p className="text-sm text-gray-400 mt-2">You'll be redirected to checkout in a moment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 