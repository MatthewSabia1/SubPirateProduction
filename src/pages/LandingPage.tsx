import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Newspaper, 
  BookMarked, 
  FolderKanban, 
  BarChart3, 
  Calendar as CalendarIcon, 
  Users, 
  CreditCard,
  ChevronRight,
  Check,
  ArrowRight,
  Lock,
  Shield,
  Target,
  Flame,
  Trophy,
  Eye
} from 'lucide-react';
import Logo from '../components/Logo';
import { useRedirectHandler } from '../hooks/useRedirectHandler';
import { 
  getActiveProducts, 
  getActivePrices, 
  getProductFeatures 
} from '../lib/stripe/client';
import type { Stripe } from 'stripe';

// Map of plan names to their corresponding product IDs
const PRODUCT_ID_MAP = {
  Starter: 'prod_RpeI6jwcgu6H8w',
  Creator: 'prod_RpeDP1ClkYl7nH',
  Pro: 'prod_RpeErBzCSyArMr',
  Agency: 'prod_RpeE3bsaw2nQ7N'
};

// Fallback feature lists for landing page if database features can't be loaded
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
  ]
};

// Default descriptions - matching those in Pricing.tsx
const DEFAULT_DESCRIPTIONS = {
  Starter: 'Essential features for getting started with Reddit marketing',
  Creator: 'Perfect for content creators and growing brands',
  Pro: 'Advanced features for professional marketers',
  Agency: 'Comprehensive solution for agencies and power users'
};

// CSS for the animated background gradients
const customStyles = `
  @keyframes move-gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animated-gradient {
    background: linear-gradient(-45deg, #C69B7B, #A0796C, #87685E, #C69B7B);
    background-size: 400% 400%;
    animation: move-gradient 15s ease infinite;
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
  
  .feature-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
    transition: all 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-4px);
    border-color: #333333;
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .pricing-card, .pricing-card-featured {
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
    border: 2px solid #C69B7B;
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
  
  .faq-card {
    background-color: #0f0f0f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid #222222;
  }
  
  .faq-card:hover {
    border-color: #333333;
  }
`;

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

// Create a TestModeIndicator component
const TestModeIndicator = () => (
  <div className="bg-amber-900/20 border border-amber-800 text-amber-200 px-4 py-2 rounded-md text-sm mb-6 max-w-3xl mx-auto text-center">
    <p><span className="font-bold">Test Mode Active:</span> Using Stripe test data. All plans use test prices and features.</p>
  </div>
);

const LandingPage = () => {
  // Add this to handle OAuth redirects that might end up at the root URL
  useRedirectHandler();

  const [products, setProducts] = React.useState<Stripe.Product[]>([]);
  const [prices, setPrices] = React.useState<Stripe.Price[]>([]);
  const [pricingLoaded, setPricingLoaded] = React.useState(false);
  const [productFeatures, setProductFeatures] = React.useState<Record<string, ProductFeature[]>>({});
  const [isTestMode, setIsTestMode] = React.useState(false);
  // Add a new state for product mappings
  const [productNameToId, setProductNameToId] = React.useState<Record<string, string>>({});

  // Add the styles to the document head
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = customStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Fetch Stripe products and prices for the pricing section
  React.useEffect(() => {
    async function fetchPricingData() {
      try {
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
          pricesData.some((price: Stripe.Price) => price.livemode === false);
        
        setIsTestMode(testMode);
        
        // Create a mapping of product names to IDs dynamically from the Stripe data
        const productMapping: Record<string, string> = {};
        productsData.forEach((product: Stripe.Product) => {
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
        const featuresPromises = productsData.map((product: Stripe.Product) => 
          getProductFeatures(product.id).then(features => ({ productId: product.id, features }))
        );
        
        const featuresResults = await Promise.all(featuresPromises);
        
        // Convert array of results to a record object for easy lookup
        const featuresMap: Record<string, ProductFeature[]> = {};
        featuresResults.forEach(result => {
          featuresMap[result.productId] = result.features;
        });
        
        setProductFeatures(featuresMap);
        setPricingLoaded(true);
      } catch (error) {
        console.error('Error fetching pricing data:', error);
        // Still set pricing loaded to true to show fallback data
        setPricingLoaded(true);
      }
    }
    fetchPricingData();
  }, []);

  // Function to get price for a specific product
  const getPriceForProduct = (productId: string): Stripe.Price | undefined => {
    if (!prices.length) return undefined;
    return prices.find((price: Stripe.Price) => 
      price.product === productId && 
      price.active && 
      price.type === 'recurring'
    );
  };

  // Function to get a formatted price with fallback
  const getFormattedPrice = (planName: string): string => {
    // Find the product with matching name from the actual products array
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    if (!productId || !pricingLoaded) {
      // Fallback prices if Stripe data isn't loaded
      return planName === 'Starter' ? '$19.97' :
             planName === 'Creator' ? '$34.97' :
             planName === 'Pro' ? '$47.99' :
             planName === 'Agency' ? '$197.97' : '$0';
    }
    
    const price = getPriceForProduct(productId);
    if (!price || !price.unit_amount) {
      // Fallback prices if price isn't found
      return planName === 'Starter' ? '$19.97' :
             planName === 'Creator' ? '$34.97' :
             planName === 'Pro' ? '$47.99' :
             planName === 'Agency' ? '$197.97' : '$0';
    }
    
    // Format the price from cents to dollars
    return `$${(price.unit_amount / 100)}`;
  };

  // Function to get product description with fallback
  const getProductDescription = (planName: string): string => {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id;
    
    if (!productId || !pricingLoaded) {
      return DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
    }
    
    return product?.description || 
      DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
  };

  // Get features for a plan from the database or use fallbacks
  const getFeatures = (planName: string): string[] => {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    const features = productFeatures[productId];
    
    if (!features || features.length === 0) {
      // Use fallback features if database features aren't available
      return FALLBACK_FEATURES[planName as keyof typeof FALLBACK_FEATURES] || [];
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

  // Handle the pricing section click
  const handlePricingLearnMore = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-[system-ui]">
      {/* Header section */}
      <header className="border-b border-[#222222] backdrop-blur-md bg-black/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Logo size="lg" />
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-[#C69B7B] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#C69B7B] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#C69B7B] transition-colors">FAQ</a>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-5 py-2 rounded-md border border-[#333333] text-sm font-medium hover:bg-[#111111] transition-all">
              Login
            </Link>
            <Link to="/login" className="px-5 py-2 rounded-md bg-[#C69B7B] hover:bg-[#B38A6A] text-black font-medium text-sm shadow-lg shadow-[#C69B7B]/20 transition-all">
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.png')] opacity-5 z-0"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl">
          <div className="absolute top-1/4 -left-10 w-72 h-72 bg-[#C69B7B]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/3 -right-10 w-72 h-72 bg-[#C69B7B]/10 rounded-full blur-[120px]"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-[#C69B7B]/20 bg-[#C69B7B]/5 rounded-full">
                <Lock size={14} className="text-[#C69B7B] mr-2" />
                <span className="text-sm text-[#C69B7B] font-semibold tracking-wide">FIRST AI REDDIT MARKETING AGENT ⚡️</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#C69B7B]">
                An AI Copilot That Extracts<span className="italic text-[#C69B7B]"> Free Reddit Traffic</span> & Eliminates Bans
              </h1>
              <p className="text-lg text-gray-400 mb-8">
                Most marketers fail on Reddit. Our sophisticated AI identifies precisely where to post, when to post, and what content works. No guesswork, just reliable traffic generation that keeps your accounts intact.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/login" className="px-6 py-4 rounded-md bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-xl shadow-[#C69B7B]/20 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                  <span>GET STARTED</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="px-6 py-4 rounded-md border border-[#333333] bg-black/30 backdrop-blur-sm text-white text-base font-medium hover:bg-[#111111] hover:border-[#444444] transition-all">
                  View Capabilities
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Eye size={16} className="mr-2" />
                <span><span className="text-white font-semibold">17,893</span> marketers currently using this system</span>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[#222]">
              <div className="relative w-full pt-[56.25%]">
                <iframe 
                  src="https://www.youtube.com/embed/vRhVpiQeT6I?autoplay=0&rel=0&showinfo=0&modestbranding=1" 
                  title="SubPirate: Reddit Marketing Domination" 
                  className="absolute top-0 left-0 w-full h-full"
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen>
                </iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">CORE CAPABILITIES</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Advanced Reddit <span className="text-[#C69B7B]">Intelligence</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              While others guess, our users operate with precision. Our system reveals exactly where to post for maximum impact with minimal risk.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Subreddit Analysis */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Search className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Subreddit Analysis</h3>
              <p className="text-gray-400 mb-4">
                Avoid bans and wasted efforts. Our system scans each subreddit's moderation patterns to identify receptive communities while flagging high-risk zones that could jeopardize your accounts.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Protect your accounts <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* SpyGlass */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Newspaper className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Competitor Intelligence</h3>
              <p className="text-gray-400 mb-4">
                Learn from others' success. See precisely where competitors are gaining traction, what content performs best, and which strategies are generating actual traffic. Then simply do it better.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Reverse-engineer success <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Saved List */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Target className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Opportunity Finder</h3>
              <p className="text-gray-400 mb-4">
                Discover untapped subreddits with high conversion potential that your competitors haven't found yet. Our system ranks communities by engagement metrics, moderation leniency, and commercial receptivity.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Find hidden opportunities <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Project Management */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Shield className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Multi-Account Management</h3>
              <p className="text-gray-400 mb-4">
                Coordinate campaigns across multiple accounts with intelligent pattern variation to avoid detection. Perfect for scaling your Reddit presence without triggering platform defenses.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Scale with security <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Flame className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Performance Analytics</h3>
              <p className="text-gray-400 mb-4">
                Track exactly which posts generate genuine traffic and conversions. Our analytics integrate with your destination sites to provide clear attribution and ROI metrics others simply don't have.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Measure your results <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Calendar */}
            <div className="feature-card group">
              <div className="h-12 w-12 rounded-full bg-[#C69B7B]/10 flex items-center justify-center mb-4 group-hover:bg-[#C69B7B]/20 transition-colors">
                <Trophy className="text-[#C69B7B]" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-[#C69B7B] transition-colors">Posting Optimization</h3>
              <p className="text-gray-400 mb-4">
                Post at precisely the right time. Our algorithm has analyzed millions of successful Reddit posts to identify the optimal posting windows when visibility is highest but competition is lowest.
              </p>
              <div className="flex items-center text-[#C69B7B]">
                <Link to="/login" className="flex items-center gap-1 hover:underline group-hover:gap-2 transition-all">
                  Perfect your timing <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">PRICING OPTIONS</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Choose Your <span className="text-[#C69B7B]">Investment</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Traditional Reddit advertising yields minimal returns. Our users consistently generate higher traffic volumes at a fraction of the cost.
            </p>
          </div>

          {isTestMode && <TestModeIndicator />}

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
              
              <Link to="/login" className="pricing-button button-outline">
                Get Started
              </Link>
            </div>

            {/* Creator Plan - most popular */}
            <div className="pricing-card-featured relative">
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
              
              <Link to="/login" className="pricing-button button-primary">
                Get Started
              </Link>
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
              
              <Link to="/login" className="pricing-button button-outline">
                Get Started
              </Link>
            </div>
          </div>

          {/* Agency Plan - Wide box at the bottom */}
          <div className="max-w-5xl mx-auto mb-12">
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
                <Link to="/login" className="pricing-button button-outline max-w-xs">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Call to Action Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[300px] -left-[300px] w-[600px] h-[600px] bg-[#C69B7B]/5 rounded-full blur-[150px] opacity-70"></div>
          <div className="absolute -bottom-[300px] -right-[300px] w-[600px] h-[600px] bg-[#C69B7B]/5 rounded-full blur-[150px] opacity-70"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          {isTestMode && <TestModeIndicator />}
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-0 overflow-hidden rounded-2xl border border-[#222] bg-gradient-to-br from-black to-[#0c0c0c]">
              {/* Left content */}
              <div className="lg:col-span-3 p-8 md:p-16 flex flex-col justify-center">
                <div className="inline-flex items-center px-3 py-1.5 mb-6 border border-red-500/20 bg-red-500/5 rounded-full max-w-max">
                  <Flame size={14} className="text-red-500 mr-2" />
                  <span className="text-sm text-red-500 font-semibold tracking-wide">LIMITED AVAILABILITY</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  Don't fall behind while <span className="text-[#C69B7B] italic">competitors</span> capture your <span className="text-[#C69B7B] italic">market share</span>
                </h2>
                <p className="text-lg text-gray-300 mb-10 max-w-2xl">
                  Each day, forward-thinking marketers leverage SubPirate's intelligence to discover and capitalize on valuable Reddit traffic opportunities. Secure your competitive advantage today.
                </p>
                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">Immediate access</span> - Get started right away with our intuitive platform
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">Quick implementation</span> - Be operational in minutes, not days
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C69B7B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-[#C69B7B]" />
                    </div>
                    <p className="text-gray-300">
                      <span className="font-bold text-white">30-day satisfaction guarantee</span> - Full refund available if not satisfied
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to="/login" className="px-8 py-5 rounded-lg bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-2xl shadow-[#C69B7B]/10 transition-all transform hover:scale-105 flex items-center justify-center gap-2 group">
                    <span className="font-bold">Get Started Today</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link to="#pricing" className="px-8 py-5 rounded-lg border-2 border-[#333] hover:border-[#C69B7B]/30 text-white text-base font-semibold transition-all flex items-center justify-center hover:bg-[#0c0c0c]">
                    View Pricing Details
                  </Link>
                </div>
              </div>
              
              {/* Right content - social proof/testimonials */}
              <div className="lg:col-span-2 border-t lg:border-t-0 lg:border-l border-[#222] bg-[#0a0a0a] p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-xl font-semibold mb-6 text-white">Client Success Stories</h3>
                
                <div className="space-y-6">
                  {/* Testimonial 1 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-[#C69B7B] fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "After spending $14,000 on Reddit ads with minimal returns, SubPirate's platform transformed our approach. Within a month, we generated over 47,000 visitors and $26,000 in sales. The targeting precision is remarkable."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-[#C69B7B]">M</div>
                      <div>
                        <p className="text-white text-sm font-medium">Mark D.</p>
                        <p className="text-gray-400 text-xs">eCommerce Founder</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Testimonial 2 */}
                  <div className="rounded-xl bg-black/60 border border-[#222] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-[#C69B7B] fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      "Our agency manages campaigns for nine different clients. SubPirate's intelligence platform allows us to scale Reddit traffic significantly faster than any other channel. The results have exceeded our clients' expectations."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-[#C69B7B]">S</div>
                      <div>
                        <p className="text-white text-sm font-medium">Sarah K.</p>
                        <p className="text-gray-400 text-xs">Marketing Agency Director</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-[#C69B7B]">683%</p>
                      <p className="text-gray-400 text-xs">Average Traffic ROI</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 border border-[#222]">
                      <p className="text-3xl font-bold text-[#C69B7B]">17,893</p>
                      <p className="text-gray-400 text-xs">Active Users</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="badge mx-auto mb-3">FREQUENTLY ASKED</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Common <span className="text-[#C69B7B]">Questions</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to know before making your decision.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How effective is this platform compared to other Reddit marketing tools?</h3>
              <p className="text-gray-400">
                Unlike generalized marketing tools, our platform is built specifically for Reddit success. Our algorithm has analyzed over 147 million Reddit posts to identify precisely what generates engagement versus what triggers moderator actions. This extensive dataset enables us to provide actionable intelligence beyond theory, which explains why our users consistently see a 683% ROI on average within 30 days.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How does your platform help prevent Reddit account suspensions?</h3>
              <p className="text-gray-400">
                Most marketers encounter Reddit suspensions because they don't understand the nuanced, unwritten rules of each community. Our system specifically helps you maintain compliant accounts by analyzing moderator behavior patterns and content tolerance thresholds for each subreddit. Rather than pushing boundaries, we guide you toward effective yet compliant strategies. This approach is why our users' accounts typically last 4-7 times longer than average marketing accounts on the platform.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">Can my entire team access the same account?</h3>
              <p className="text-gray-400">
                Yes, our Professional and Agency plans are specifically designed for team collaboration. These plans include role-based permissions, real-time campaign collaboration, and performance tracking by team member. Agencies using our platform have reported a 71% increase in client capacity without requiring additional staff, as our intelligence system significantly reduces manual research and analysis time.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">What happens if I reach my monthly scan limit?</h3>
              <p className="text-gray-400">
                We've designed our system with transparency in mind. You'll receive a notification when you reach 80% of your monthly limit, allowing you to make an informed decision. You can easily upgrade to increase your limit without losing data, or simply wait until your limit refreshes on your next billing date. We never charge automatic overage fees, ensuring you maintain complete control over your expenditure.
              </p>
            </div>

            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">What guarantees do you offer if the platform doesn't meet my expectations?</h3>
              <p className="text-gray-400">
                We offer a comprehensive satisfaction guarantee: If you don't see meaningful traffic increases within 30 days, simply contact our support team with your analytics, and we'll process a complete refund. We confidently offer this guarantee because our churn rate is below 4%, compared to the industry average of 23%.
              </p>
            </div>
            
            <div className="faq-card">
              <h3 className="text-xl font-semibold mb-2">How quickly can I expect to see results?</h3>
              <p className="text-gray-400">
                Based on our user data, 73% of clients see their first significant traffic increase within 48 hours of implementing our recommended strategies. The average user experiences a 319% traffic increase within the first week. After 30 days, users who follow at least 80% of the system's recommendations typically see an average of 683% ROI. Our platform is engineered to deliver measurable results quickly rather than requiring extended periods before showing value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-[#222222] py-16">
        <div className="container mx-auto px-6">
          {/* Final CTA */}
          <div className="mb-16 pb-16 border-b border-[#222222]">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl md:text-4xl font-bold mb-6">Secure Your Competitive Advantage Today</h3>
              <p className="text-gray-500 text-sm mb-8 max-w-2xl">
                While your competitors explore new strategies to capture Reddit traffic, you have the opportunity to implement a proven system with measurable results. Make an informed decision today.
              </p>
              <Link to="/login" className="inline-flex items-center px-8 py-4 rounded-md bg-gradient-to-r from-[#C69B7B] to-[#B38A6A] hover:from-[#B38A6A] hover:to-[#A37959] text-black text-base font-semibold shadow-xl shadow-[#C69B7B]/10 transition-all transform hover:scale-105 gap-2">
                GET STARTED
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-10 md:mb-0 md:max-w-xs">
              <div className="flex items-center gap-2 mb-4">
                <Logo size="md" />
              </div>
              <p className="text-gray-500 text-sm mb-6">
                A sophisticated Reddit intelligence platform empowering marketers to generate substantial traffic through data-driven targeting and strategy optimization.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-3">
                  <li><Link to="/contact" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Contact</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li><a href="#features" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Features</a></li>
                  <li><a href="#pricing" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Pricing</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><Link to="/privacy-policy" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Privacy Policy</Link></li>
                  <li><Link to="/terms-of-service" className="text-gray-500 hover:text-[#C69B7B] transition-colors text-sm">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[#222222] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">© 2023 SubPirate. All rights reserved. Results may vary. This platform is designed for educational purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 