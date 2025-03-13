import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import type { Stripe } from 'stripe';

interface SubscriptionOptionsProps {
  existingSubscription: boolean | null;
}

export default function SubscriptionOptions({ existingSubscription }: SubscriptionOptionsProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Stripe.Product[]>([]);
  const [prices, setPrices] = useState<Stripe.Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [creatingCheckoutSession, setCreatingCheckoutSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductsAndPrices = async () => {
      try {
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('stripe_products')
          .select('*')
          .eq('active', true)
          .order('metadata->order', { ascending: true });

        if (productsError) throw productsError;

        // Fetch prices
        const { data: pricesData, error: pricesError } = await supabase
          .from('stripe_prices')
          .select('*')
          .eq('active', true)
          .order('unit_amount', { ascending: true });

        if (pricesError) throw pricesError;

        // Set the data in state
        setProducts(productsData as any);
        setPrices(pricesData as any);

        // Set default selection to the first price
        if (pricesData.length > 0) {
          setSelectedPriceId(pricesData[0].id);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching products and prices:", error);
        setError("Failed to load subscription options. Please try again later.");
        setLoading(false);
      }
    };

    fetchProductsAndPrices();
  }, []);

  const handlePriceSelection = (priceId: string) => {
    setSelectedPriceId(priceId);
  };

  const handleSubscribe = async () => {
    if (!user || !selectedPriceId) return;

    setCreatingCheckoutSession(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          priceId: selectedPriceId,
          mode: 'subscription',
          successUrl: `${window.location.origin}/subscription?checkout=success`,
          cancelUrl: `${window.location.origin}/subscription`
        }
      });

      if (error) throw error;
      if (!data || !data.url) throw new Error('Invalid response from server');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'Failed to create checkout session');
      setCreatingCheckoutSession(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setCreatingCheckoutSession(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { 
          returnUrl: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
      if (!data || !data.url) throw new Error('Invalid response from server');

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Error creating portal session:', err);
      setError(err.message || 'Failed to create portal session');
      setCreatingCheckoutSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-100 my-4">
        {error}
      </div>
    );
  }

  if (existingSubscription) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Manage Your Subscription</h2>
        <p className="text-gray-300 mb-6">
          You currently have an active subscription. You can manage your payment methods, 
          view billing history, or change your subscription plan.
        </p>
        <button
          onClick={handleManageSubscription}
          disabled={creatingCheckoutSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition duration-200 flex items-center justify-center"
        >
          {creatingCheckoutSession ? (
            <>
              <LoadingSpinner size={5} className="mr-2" />
              Redirecting...
            </>
          ) : (
            'Manage Subscription'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        // Find all prices for this product
        const productPrices = prices.filter((price) => price.product === product.id);
        
        if (productPrices.length === 0) return null;

        return (
          <div 
            key={product.id} 
            className={`bg-gray-800 rounded-lg p-6 shadow-lg border-2 transition-all duration-200 ${
              productPrices.some(p => p.id === selectedPriceId) 
                ? 'border-blue-500 transform scale-102' 
                : 'border-transparent'
            }`}
          >
            <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
            <p className="text-gray-300 mb-4">{product.description}</p>
            
            <div className="mb-6">
              {productPrices.map((price) => {
                // Format price
                const amount = (price.unit_amount || 0) / 100;
                const formattedPrice = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: price.currency,
                  minimumFractionDigits: 2,
                }).format(amount);

                const interval = price.recurring?.interval;
                const intervalCount = price.recurring?.interval_count || 1;
                
                // Properly format the interval text
                let intervalText = '';
                if (interval === 'month' && intervalCount === 1) {
                  intervalText = 'monthly';
                } else if (interval === 'year' && intervalCount === 1) {
                  intervalText = 'yearly';
                } else {
                  intervalText = `every ${intervalCount} ${interval}${intervalCount !== 1 ? 's' : ''}`;
                }

                return (
                  <div 
                    key={price.id}
                    onClick={() => handlePriceSelection(price.id)}
                    className={`
                      p-3 rounded-md mb-2 cursor-pointer transition-colors
                      ${price.id === selectedPriceId 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <span>{formattedPrice} {intervalText}</span>
                      {price.id === selectedPriceId && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubscribe}
              disabled={!productPrices.some(p => p.id === selectedPriceId) || creatingCheckoutSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition duration-200 flex items-center justify-center"
            >
              {creatingCheckoutSession ? (
                <>
                  <LoadingSpinner size={5} className="mr-2" />
                  Redirecting...
                </>
              ) : (
                'Subscribe Now'
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
} 