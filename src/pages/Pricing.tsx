import React from 'react';
import { Check } from 'lucide-react';
import { 
  getActiveProducts, 
  getActivePrices, 
  createCheckoutSession,
  getProductFeatures 
} from '../lib/stripe/client';
import type { Stripe } from 'stripe';
import { useAuth } from '../contexts/AuthContext';

// Map of plan names to their corresponding product IDs - same as in LandingPage.tsx
const PRODUCT_ID_MAP = {
  Starter: 'prod_RpeI6jwcgu6H8w',
  Creator: 'prod_RpeDP1ClkYl7nH',
  Pro: 'prod_RpeErBzCSyArMr',
  Agency: 'prod_RpeE3bsaw2nQ7N'
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

// Default descriptions - matching LandingPage
const DEFAULT_DESCRIPTIONS = {
  Starter: 'Essential features for getting started with Reddit marketing',
  Creator: 'Perfect for content creators and growing brands',
  Pro: 'Advanced features for professional marketers',
  Agency: 'Perfect for content creators and growing brands'
};

// Interface for product features from the database
interface ProductFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Add a new interface for product data mapping
interface ProductMapping {
  id: string;
  name: string;
}

// Add CSS for pricing cards
const styles = `
.pricing-card {
  background-color: #0f0f0f;
  border-radius: 1rem;
  padding: 2rem;
  border: 1px solid #222222;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
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

.faq-card {
  background-color: #0f0f0f;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #222222;
  transition: all 0.3s ease;
}

.faq-card:hover {
  border-color: #333333;
}
`;

export default function Pricing() {
  const { user } = useAuth();
  const [products, setProducts] = React.useState<Stripe.Product[]>([]);
  const [prices, setPrices] = React.useState<Stripe.Price[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [productFeatures, setProductFeatures] = React.useState<Record<string, ProductFeature[]>>({});
  const [isTestMode, setIsTestMode] = React.useState(false);
  // Add a new state for product mappings
  const [productNameToId, setProductNameToId] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch products, prices, and features in parallel
        const [productsData, pricesData] = await Promise.all([
          getActiveProducts(),
          getActivePrices()
        ]);
        
        setProducts(productsData);
        setPrices(pricesData);
        
        // Check if we're in test mode
        const testMode = 
          window.location.hostname === 'localhost' || 
          window.location.hostname.includes('staging') ||
          pricesData.some(price => price.livemode === false);
        
        setIsTestMode(testMode);
        
        // Create a mapping of product names to IDs dynamically from the Stripe data
        const productMapping: Record<string, string> = {};
        productsData.forEach(product => {
          // Use the name as a key (removing any non-alphanumeric characters)
          const normalizedName = product.name?.replace(/[^a-zA-Z0-9]/g, '') || '';
          productMapping[product.name || ''] = product.id;
        });
        
        // Use this mapping or fall back to hardcoded values if no products found
        const effectiveMapping = Object.keys(productMapping).length > 0 
          ? productMapping 
          : PRODUCT_ID_MAP;
        
        setProductNameToId(effectiveMapping);
        
        // After setting products, fetch features for each product
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
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pricing data'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading pricing information...</div>
    </div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Error loading pricing data. Please try again later.</div>
      </div>
    );
  }

  // Fallback price IDs if the real ones can't be found
  const priceFallbacks = {
    Starter: 'price_1Qvz1UCtsTY6FiiZTyGPNs1F',
    Creator: 'price_1Qvz3GCtsTY6FiiZtiU2XiAq',
    Pro: 'price_1Qvz2WCtsTY6FiiZ4uiEB7sk',
    Agency: 'price_1Qvz27CtsTY6FiiZYbT6acEB'
  };

  // Get price for a product
  const getPriceForProduct = (planName: string): Stripe.Price | undefined => {
    const product = products.find((p: Stripe.Product) => p.name === planName);
    if (!product) return undefined;
    
    return prices.find((price: Stripe.Price) => price.product === product.id);
  };
  
  // Format price with currency symbol
  const getFormattedPrice = (planName: string): string => {
    const price = getPriceForProduct(planName);
    if (!price || !price.unit_amount) {
      return '$0.00';
    }
    
    const formattedPrice = (price.unit_amount / 100).toFixed(2);
    return `$${formattedPrice}`;
  };
  
  // Get product description with fallback
  const getProductDescription = (planName: string): string => {
    const product = products.find((p: Stripe.Product) => p.name === planName);
    
    if (!product) {
      return DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
    }
    
    return product.description || 
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
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    if (!productId) {
      console.error('Invalid plan name:', planName);
      alert('Selected plan is not available. Please try another plan.');
      return;
    }

    const price = getPriceForProduct(planName);
    const priceId = price?.id || priceFallbacks[planName as keyof typeof priceFallbacks];

    if (!priceId) {
      console.error('No price ID found for the selected plan');
      console.log('Available products:', products);
      console.log('Available prices:', prices);
      
      alert('Price ID not found. Please try another plan or contact support.');
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      alert('Please sign in to subscribe to a plan.');
      return;
    }

    try {
      console.log(`Starting checkout for plan ${planName} with price ID ${priceId}`);
      
      const session = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/?checkout=success`,
        cancelUrl: `${window.location.origin}/pricing`,
        userId: user.id,
      });

      if (!session?.url) {
        throw new Error('Failed to create checkout session URL');
      }

      window.location.href = session.url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      
      // Check for specific error cases and provide helpful messages
      if (err.message && err.message.includes('Test/Live mode mismatch')) {
        alert('Error: There is a mismatch between test and live mode. Please contact support.');
      } else if (err.message && (err.message.includes('live mode') || err.message.includes('test mode'))) {
        alert('Error: You are using price IDs from live mode with a test mode API key or vice versa. Please contact support for assistance.');
      } else if (err.message && err.message.includes('Invalid price ID')) {
        alert('The selected price is invalid. Please try another plan or contact support.');
      } else if (err.message && err.message.includes('Tax ID collection')) {
        alert('There was an issue with tax information collection. Please try again.');
      } else if (err.message && err.message.includes('No such price')) {
        alert('The selected pricing plan is unavailable. Please try another plan or contact support.');
      } else if (err.message && err.message.includes('No such customer')) {
        alert('Your customer information could not be found. Please contact support for assistance.');
      } else {
        alert('Failed to start checkout process. Please try again or contact support if the issue persists.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <style>{styles}</style>
      <div className="container mx-auto px-6 py-24">
        {isTestMode && <TestModeIndicator />}
        
        <div className="text-center mb-16">
          <div className="badge mx-auto mb-3">PRICING OPTIONS</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Choose Your <span className="text-[#C69B7B]">Investment</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Traditional Reddit advertising yields minimal returns. Our users consistently generate higher traffic volumes at a fraction of the cost.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-8">
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
              Get Started
            </button>
          </div>

          {/* Creator Plan - Most Popular */}
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
              Get Started
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
              Get Started
            </button>
          </div>
        </div>

        {/* Agency Plan - Wide box at the bottom */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="pricing-card border border-gray-800 rounded-lg bg-gray-900/50">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-2">Agency</h3>
                <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Agency')}<span className="text-lg text-gray-400">/mo</span></div>
                <p className="text-gray-400 mb-6">{getProductDescription('Agency')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Get Started
              </button>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <div className="badge mx-auto mb-3">ENTERPRISE USERS</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise <span className="text-[#C69B7B]">Solutions</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Need a custom solution? We offer tailored plans for large organizations
            with specific requirements.
          </p>
          <a
            href="mailto:enterprise@subpirate.com"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-lg shadow-[#C69B7B]/20 transition-all transform hover:scale-105 rounded-md"
          >
            Contact Sales
          </a>
        </div>

        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="badge mx-auto mb-3">FREQUENTLY ASKED</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Common <span className="text-[#C69B7B]">Questions</span>
            </h2>
            <p className="text-gray-400 mb-4 max-w-2xl mx-auto">
              Everything you need to know before making your decision.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be
                reflected in your next billing cycle.
              </p>
            </div>
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, Mastercard, American Express)
                and PayPal.
              </p>
            </div>
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-400">
                If you're not satisfied with our service within 30 days of your purchase,
                we'll refund your payment. Please contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 