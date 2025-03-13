import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import RedditConnectModal from '../components/RedditConnectModal';
import { useLocation } from 'react-router-dom';
import { useFeatureAccess } from './FeatureAccessContext';

type RedditAccountContextType = {
  hasRedditAccounts: boolean;
  isLoading: boolean;
  connectRedditAccount: () => void;
  refreshAccountStatus: () => Promise<void>;
};

const RedditAccountContext = createContext<RedditAccountContextType>({
  hasRedditAccounts: false,
  isLoading: true,
  connectRedditAccount: () => {},
  refreshAccountStatus: async () => {},
});

export const useRedditAccounts = () => useContext(RedditAccountContext);

export const RedditAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { checkUsageLimit } = useFeatureAccess();
  const [hasRedditAccounts, setHasRedditAccounts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRedditConnectModal, setShowRedditConnectModal] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  
  // Track if modal has been dismissed on the current page
  const [modalDismissedOnCurrentPage, setModalDismissedOnCurrentPage] = useState(false);
  // Ref to track if we've checked for accounts on this page load
  const checkedOnCurrentPageRef = useRef(false);
  // Ref to track the last pathname to avoid duplicate checks for the same path
  const lastPathCheckedRef = useRef('');
  // Track if user is authenticated to avoid unnecessary checks
  const isAuthenticatedRef = useRef(false);
  
  // List of public paths where we should never show the Reddit connect modal
  const publicPaths = ['/', '/login', '/pricing', '/subscription', '/auth/callback'];
  
  // Check if current path is a public path
  const isPublicPath = useCallback(() => {
    // Only consider exact matches for public paths to avoid blocking subpaths
    return publicPaths.some(path => location.pathname === path);
  }, [location.pathname]);
  
  // Fetch current subscription status
  const checkSubscription = useCallback(async () => {
    if (!user) {
      console.log('RedditAccountContext: No user for subscription check');
      setHasSubscription(false);
      setSubscriptionLoading(false);
      return;
    }
    
    try {
      // Check for subscriptions in test environment
      const isTestEnvironment = 
        window.location.hostname === 'localhost' || 
        window.location.hostname.includes('127.0.0.1');
        
      if (isTestEnvironment) {
        console.log('RedditAccountContext: Test environment detected, assuming subscription exists');
        setHasSubscription(true);
        setSubscriptionLoading(false);
        return;
      }
      
      setSubscriptionLoading(true);
      
      // Check for any active/trialing subscription
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .or('status.eq.active,status.eq.trialing');
      
      if (error) {
        console.error('RedditAccountContext: Error checking subscriptions:', error);
        // Default to allowing on error
        setHasSubscription(true);
      } else {
        const hasActiveSubscription = data && data.length > 0;
        console.log('RedditAccountContext: User has subscription:', hasActiveSubscription);
        setHasSubscription(hasActiveSubscription);
      }
    } catch (err) {
      console.error('RedditAccountContext: Error in subscription check:', err);
      // Default to allowing on error
      setHasSubscription(true);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);
  
  // Check if the user has any Reddit accounts
  const checkForRedditAccounts = useCallback(async () => {
    if (!user) {
      console.log('RedditAccountContext: No user, not showing modal');
      setIsLoading(false);
      setShowRedditConnectModal(false);
      return;
    }
    
    // Don't check if we're on a public path
    if (isPublicPath()) {
      console.log('RedditAccountContext: On public path, not showing Reddit connect modal');
      setShowRedditConnectModal(false);
      return;
    }
    
    // Don't check if we've already checked on this page and the modal was dismissed
    if (checkedOnCurrentPageRef.current && modalDismissedOnCurrentPage) {
      console.log('RedditAccountContext: Modal already dismissed on this page');
      return;
    }
    
    // Don't show modal if user doesn't have a subscription
    if (!hasSubscription) {
      console.log('RedditAccountContext: User has no subscription, not showing Reddit connect modal');
      setShowRedditConnectModal(false);
      return;
    }
    
    try {
      console.log('RedditAccountContext: Checking for Reddit accounts...');
      setIsLoading(true);
      
      // Get the current count of Reddit accounts
      const { data, error, count } = await supabase
        .from('reddit_accounts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
        
      if (error) {
        console.error('RedditAccountContext: Error fetching Reddit accounts:', error);
        throw error;
      }
      
      const hasAccounts = data && data.length > 0;
      setHasRedditAccounts(hasAccounts);
      
      // Check if user has reached their account limit
      const accountCount = count || 0;
      const canAddMoreAccounts = checkUsageLimit('reddit_accounts', accountCount);
      
      console.log('RedditAccountContext: Reddit accounts check:', hasAccounts ? 'Has accounts' : 'No accounts');
      console.log('RedditAccountContext: Account limit check:', canAddMoreAccounts ? 'Can add more accounts' : 'Account limit reached');
      console.log('RedditAccountContext: Modal conditions:', {
        noAccounts: !hasAccounts,
        notDismissed: !modalDismissedOnCurrentPage,
        hasSubscription,
        notPublicPath: !isPublicPath(),
        canAddMoreAccounts
      });
      
      // Show modal if:
      // 1. User has NO Reddit accounts
      // 2. AND has not dismissed the modal, has a subscription, and isn't on a public page
      if (!hasAccounts && !modalDismissedOnCurrentPage && hasSubscription && !isPublicPath()) {
        console.log('RedditAccountContext: All conditions met, showing Reddit connect modal');
        setShowRedditConnectModal(true);
      } else {
        console.log('RedditAccountContext: Not all conditions met, not showing Reddit connect modal');
        setShowRedditConnectModal(false);
      }
      
      // Mark that we've checked on this page
      checkedOnCurrentPageRef.current = true;
    } catch (err) {
      console.error('RedditAccountContext: Error checking for Reddit accounts:', err);
      // On error, default to not showing the modal
      setShowRedditConnectModal(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, hasSubscription, modalDismissedOnCurrentPage, isPublicPath, checkUsageLimit]);
  
  // Public function to refresh account status
  const refreshAccountStatus = useCallback(async () => {
    console.log('RedditAccountContext: Manually refreshing account status');
    // Reset the checked flag when manually refreshing
    checkedOnCurrentPageRef.current = false;
    // Check subscription status first
    await checkSubscription();
    // Then check for Reddit accounts
    await checkForRedditAccounts();
  }, [checkForRedditAccounts, checkSubscription]);
  
  // Connect Reddit account
  const connectRedditAccount = useCallback(() => {
    // Generate a random state string for security
    const state = Math.random().toString(36).substring(7);
    
    // Store state in session storage to verify on callback
    sessionStorage.setItem('reddit_oauth_state', state);

    // Construct the OAuth URL with expanded scopes
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_REDDIT_APP_ID,
      response_type: 'code',
      state,
      redirect_uri: `${window.location.origin}/auth/reddit/callback`,
      duration: 'permanent',
      scope: [
        'identity',
        'read',
        'submit',
        'subscribe',
        'history',
        'mysubreddits',
        'privatemessages',
        'save',
        'vote',
        'edit',
        'flair',
        'report'
      ].join(' ')
    });

    // Redirect to Reddit's OAuth page
    window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
  }, []);
  
  // Handle modal close - track dismissal for current page only
  const handleModalClose = useCallback(() => {
    console.log('RedditAccountContext: Modal dismissed for current page');
    setShowRedditConnectModal(false);
    setModalDismissedOnCurrentPage(true);
  }, []);
  
  // Check for subscription status when the component mounts and when the user changes
  useEffect(() => {
    let mounted = true;
    
    if (user) {
      if (!isAuthenticatedRef.current) {
        console.log('RedditAccountContext: User authenticated, checking subscription');
        isAuthenticatedRef.current = true;
        
        // Check subscription status first
        const timer = setTimeout(() => {
          if (mounted) {
            checkSubscription().then(() => {
              // Only check for Reddit accounts after subscription check completes
              if (mounted) {
                checkForRedditAccounts();
              }
            });
          }
        }, 100);
        return () => {
          mounted = false;
          clearTimeout(timer);
        };
      }
    } else {
      isAuthenticatedRef.current = false;
      if (mounted) {
        setHasRedditAccounts(false);
        setHasSubscription(false);
        setIsLoading(false);
        setSubscriptionLoading(false);
        setShowRedditConnectModal(false);
        checkedOnCurrentPageRef.current = false;
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [user]);
  
  // Reset modal dismissed state when location changes (navigating to a new page)
  useEffect(() => {
    let mounted = true;
    
    // Only reset dismissed state and check if the path has actually changed
    if (lastPathCheckedRef.current !== location.pathname) {
      console.log('RedditAccountContext: Location changed to:', location.pathname);
      
      // Update our ref to the current path
      lastPathCheckedRef.current = location.pathname;
      
      // Only reset modal state if we're not on a public path
      if (!isPublicPath() && user) {
        console.log('RedditAccountContext: Resetting modal dismissed state');
        
        if (mounted) {
          // Reset flags for the new page
          setModalDismissedOnCurrentPage(false);
          checkedOnCurrentPageRef.current = false;
          
          // Check subscription status first, then check for Reddit accounts
          const timer = setTimeout(() => {
            if (mounted && hasSubscription) {
              checkForRedditAccounts();
            }
          }, 100);
          return () => {
            mounted = false;
            clearTimeout(timer);
          };
        }
      }
    }
    
    return () => {
      mounted = false;
    };
  }, [location.pathname, user, hasSubscription, checkForRedditAccounts]);
  
  return (
    <RedditAccountContext.Provider
      value={{
        hasRedditAccounts,
        isLoading,
        connectRedditAccount,
        refreshAccountStatus,
      }}
    >
      {children}
      
      {/* Global Reddit Connect Modal - Only show on backend pages after subscription check */}
      <RedditConnectModal
        isOpen={showRedditConnectModal}
        onClose={handleModalClose}
        onConnect={connectRedditAccount}
      />
    </RedditAccountContext.Provider>
  );
}; 