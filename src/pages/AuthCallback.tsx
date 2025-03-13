import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// Constants for retry mechanism
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

// Helper function to check if a user has an active subscription
async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    console.log(`AuthCallback: Checking subscription for user ${userId}...`);
    
    // First check if user is an admin - admins should bypass subscription checks
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: userId });
    
    if (!adminError && isAdmin) {
      console.log('AuthCallback: User is admin, bypassing subscription check');
      return true;
    }
    
    if (adminError) {
      console.error('AuthCallback: Error checking admin status:', adminError);
    }
    
    // 1. Check if user has any active subscription in the subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) {
      console.error('AuthCallback: Error checking subscriptions table:', subscriptionError);
    }
    
    // If we found an active subscription in the first table, return true
    if (subscriptionData) {
      console.log('AuthCallback: Found active subscription in subscriptions table:', subscriptionData);
      return true;
    }
    
    // 2. Check if user has any active subscription in the customer_subscriptions table
    console.log('AuthCallback: Checking customer_subscriptions table...');
    
    // Try with individual queries to avoid OR condition that might be causing issues
    // First try active status
    const { data: activeData, error: activeError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
      
    if (activeError) {
      console.error('AuthCallback: Error checking active subscriptions:', activeError);
    }
    
    if (activeData) {
      console.log('AuthCallback: Found active subscription in customer_subscriptions table:', activeData);
      return true;
    }
    
    // Try trialing status
    const { data: trialingData, error: trialingError } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'trialing')
      .maybeSingle();
      
    if (trialingError) {
      console.error('AuthCallback: Error checking trialing subscriptions:', trialingError);
    }
    
    if (trialingData) {
      console.log('AuthCallback: Found trialing subscription in customer_subscriptions table:', trialingData);
      return true;
    }
    
    // No active subscription found in either table
    console.log('AuthCallback: No active subscription found in any table for user', userId);
    return false;
  } catch (error) {
    console.error('AuthCallback: Exception checking subscription status:', error);
    // If there's an exception, default to letting them continue for better UX
    return true;
  }
}

// Handle Stripe checkout success
async function handleStripeCheckoutSuccess(userId: string): Promise<boolean> {
  try {
    console.log('AuthCallback: Processing Stripe checkout success for user', userId);
    
    // After Stripe checkout success, we'll make a direct check for the subscription
    // but we may need to wait a moment for the webhook to process the subscription
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      // Check both subscription tables directly
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);
        
      if (!subscriptionsError && subscriptions && subscriptions.length > 0) {
        console.log('AuthCallback: Found subscription after checkout:', subscriptions[0]);
        return true;
      }
      
      const { data: customerSubscriptions, error: customerSubscriptionsError } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', userId);
        
      if (!customerSubscriptionsError && customerSubscriptions && customerSubscriptions.length > 0) {
        console.log('AuthCallback: Found customer subscription after checkout:', customerSubscriptions[0]);
        return true;
      }
      
      console.log(`AuthCallback: No subscription found after checkout, attempt ${attempts + 1}/${maxAttempts}`);
      attempts++;
      
      // Wait before trying again
      if (attempts < maxAttempts) {
        console.log('AuthCallback: Waiting before retrying subscription check...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // If we've tried several times and still no subscription, force a page refresh
    console.log('AuthCallback: Unable to detect subscription after checkout, forcing navigation to dashboard');
    return true; // Return true to allow user to proceed to dashboard
  } catch (error) {
    console.error('AuthCallback: Error handling Stripe checkout success:', error);
    return true; // In case of error, let the user proceed
  }
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        if (retries >= MAX_RETRIES) {
          setError('Failed to authenticate after multiple attempts. Please try logging in again.');
          setLoading(false);
          return;
        }

        // Check if this is a Stripe checkout success callback
        const searchParams = new URLSearchParams(window.location.search);
        const isCheckoutSuccess = searchParams.get('checkout') === 'success';
        
        if (isCheckoutSuccess && user) {
          console.log('AuthCallback: Processing Stripe checkout success callback');
          const hasSubscription = await handleStripeCheckoutSuccess(user.id);
          
          if (hasSubscription) {
            console.log('AuthCallback: Checkout success processed, redirecting to dashboard');
            setLoading(false);
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // If we already have a user, check their subscription status
        if (user) {
          console.log('User already authenticated:', user.id);
          
          try {
            // Check if the user has an active subscription
            const hasSubscription = await checkUserSubscription(user.id);
            
            if (!hasSubscription) {
              console.log('User has no active subscription, redirecting to subscription page');
              navigate('/subscription', { 
                replace: true,
                state: { newUser: true }
              });
              return;
            }
            
            // User has a subscription, redirect to dashboard
            setLoading(false);
            navigate('/dashboard', { replace: true });
            return;
          } catch (error) {
            console.error('Error during subscription check in AuthCallback:', error);
            // In case of error, let users through to dashboard
            setLoading(false);
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // Check if there are any URL parameters indicating authentication
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const hash = window.location.hash;

        // If we have parameters from the URL, use them to set the session
        if (accessToken && refreshToken) {
          console.log('Setting session from URL parameters');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw error;
          }

          // Successful session set, fetch user and check subscription
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Check if the user has an active subscription
            try {
              const hasSubscription = await checkUserSubscription(user.id);
              
              if (!hasSubscription) {
                console.log('User has no active subscription, redirecting to subscription page');
                navigate('/subscription', { 
                  replace: true,
                  state: { newUser: true }
                });
                return;
              }
              
              // User has a subscription, redirect to dashboard
              setLoading(false);
              navigate('/dashboard', { replace: true });
              return;
            } catch (error) {
              console.error('Error during subscription check in AuthCallback (URL params):', error);
              // In case of error, let users through to dashboard
              setLoading(false);
              navigate('/dashboard', { replace: true });
              return;
            }
          }
        }

        // If we have a hash, try to exchange it for a session
        if (hash && hash.includes('access_token')) {
          console.log('Processing hash for authentication');
          
          // Extract access token from hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          
          if (hashAccessToken && hashRefreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken
            });
            
            if (error) {
              throw error;
            }
            
            // Successful session exchange, fetch user and check subscription
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              // Check if the user has an active subscription
              try {
                const hasSubscription = await checkUserSubscription(user.id);
                
                if (!hasSubscription) {
                  console.log('User has no active subscription, redirecting to subscription page');
                  navigate('/subscription', { 
                    replace: true,
                    state: { newUser: true }
                  });
                  return;
                }
                
                // User has a subscription, redirect to dashboard
                setLoading(false);
                navigate('/dashboard', { replace: true });
                return;
              } catch (error) {
                console.error('Error during subscription check in AuthCallback (hash):', error);
                // In case of error, let users through to dashboard
                setLoading(false);
                navigate('/dashboard', { replace: true });
                return;
              }
            }
          }
        }

        // No authentication data found yet, wait and retry
        console.log(`Authentication data not found, retrying (${retries + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          setRetries(retries + 1);
        }, RETRY_DELAY);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate. Please try logging in again.');
        setLoading(false);
      }
    };

    handleAuthSuccess();
  }, [user, retries, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {loading ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Completing Authentication</h1>
            <p className="mb-4">Please wait while we complete the authentication process...</p>
            <LoadingSpinner size={12} />
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Complete</h1>
            <p className="mb-4">You are now authenticated! Redirecting to the dashboard...</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
} 