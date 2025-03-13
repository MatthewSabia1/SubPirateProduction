import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRedditAccounts } from '../contexts/RedditAccountContext';

export default function RedditOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [exchangeAttempted, setExchangeAttempted] = useState(false);
  
  // Get code and state from URL params once to prevent dependency changes
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const urlError = searchParams.get('error');

  // Here we need to force a re-check of the accounts after the callback is complete
  const { refreshAccountStatus } = useRedditAccounts();

  // Memoize the callback handler
  const handleCallback = useCallback(async () => {
    if (exchangeAttempted || !user) {
      return;
    }
    
    setExchangeAttempted(true);

    try {
      const storedState = sessionStorage.getItem('reddit_oauth_state');
      
      if (urlError) {
        throw new Error(`Reddit OAuth error: ${urlError}`);
      }

      if (!code) {
        throw new Error('No authorization code received from Reddit');
      }

      // Verify state to prevent CSRF attacks
      if (state !== storedState) {
        throw new Error('Invalid state parameter');
      }

      // Use the exact redirect URI format that Reddit redirects to
      const redirectUri = `${window.location.origin}/auth/reddit/callback`;
      
      // Clean the code (remove any URL fragments)
      const cleanCode = code.split('#')[0];

      // Exchange the code for tokens with retries
      let tokens = {
        access_token: '',
        refresh_token: '',
        expires_in: 0,
        scope: ''
      };

      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 1000;

      while (retryCount < maxRetries) {
        try {
          console.log('Attempting token exchange with:', {
            clientId: import.meta.env.VITE_REDDIT_APP_ID,
            redirectUri,
            code: cleanCode.slice(0, 5) + '...',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'web:SubPirate:1.0.0'
            }
          });

          // Validate credentials
          if (!import.meta.env.VITE_REDDIT_APP_ID || !import.meta.env.VITE_REDDIT_APP_SECRET) {
            throw new Error('Reddit client credentials are not configured properly');
          }

          const authString = btoa(`${import.meta.env.VITE_REDDIT_APP_ID}:${import.meta.env.VITE_REDDIT_APP_SECRET}`);
          
          const params = new URLSearchParams();
          params.append('grant_type', 'authorization_code');
          params.append('code', cleanCode);
          params.append('redirect_uri', redirectUri);

          // Log exact request details (excluding sensitive info)
          console.log('Token exchange request:', {
            url: 'https://www.reddit.com/api/v1/access_token',
            method: 'POST',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          });

          const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${authString}`,
              'User-Agent': 'web:SubPirate:1.0.0',
              'Accept': 'application/json'
            },
            body: params.toString(),
            mode: 'cors',
            credentials: 'omit'
          });

          const responseText = await response.text();
          
          // Log response details
          console.log('Token exchange response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText,
            requestUrl: response.url
          });

          if (!response.ok) {
            // Try to parse error response
            let errorMessage = responseText;
            try {
              const errorJson = JSON.parse(responseText);
              // Check if this is a "used authorization code" error
              if (errorJson.error === 'invalid_grant') {
                console.warn('Authorization code already used');
                return; // Exit silently for duplicate requests
              }
              errorMessage = errorJson.message || errorJson.error || responseText;
            } catch (e) {
              // Keep original error message if parsing fails
            }

            // Don't retry on auth errors
            if (response.status === 401 || response.status === 403 || response.status === 400) {
              throw new Error(`Failed to exchange code for tokens: ${errorMessage}`);
            }

            // Only retry on network errors or 5xx errors
            if (!response.status || response.status >= 500) {
              const delay = baseDelay * Math.pow(2, retryCount);
              console.log(`Retrying after ${delay}ms due to error:`, errorMessage);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }

            throw new Error(`Failed to exchange code for tokens: ${errorMessage}`);
          }

          try {
            const parsed = JSON.parse(responseText);
            if (!parsed.access_token || !parsed.refresh_token) {
              console.error('Invalid token response:', parsed);
              throw new Error('Invalid token response from Reddit: missing required tokens');
            }
            tokens = parsed as typeof tokens;
            break; // Success - exit retry loop
          } catch (e) {
            console.error('Failed to parse token response:', e);
            throw new Error('Invalid JSON response from Reddit');
          }
        } catch (error) {
          if (retryCount === maxRetries - 1) throw error;
          retryCount++;
        }
      }

      // Get user info from Reddit with retries
      let redditUser;
      retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'User-Agent': 'web:SubPirate:1.0.0'
            }
          });

          if (!userResponse.ok) {
            if (userResponse.status === 429) {
              const delay = baseDelay * Math.pow(2, retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }
            throw new Error('Failed to get Reddit user info');
          }

          redditUser = await userResponse.json();
          
          // Log the full user data for debugging
          console.log('Reddit user data:', {
            ...redditUser,
            access_token: '[REDACTED]',
            refresh_token: '[REDACTED]'
          });

          break;
        } catch (error) {
          if (retryCount === maxRetries - 1) throw error;
          retryCount++;
        }
      }

      // Make sure user_usage_stats record exists for this user first
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      await supabase
        .from('user_usage_stats')
        .upsert({
          user_id: user.id,
          month_start: monthStart.toISOString(),
          month_end: monthEnd.toISOString(),
          subreddit_analysis_count: 0,
          reddit_accounts_count: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id,month_start'
        });

      // Store the account in the database with expanded user data
      const { error: dbError } = await supabase
        .from('reddit_accounts')
        .upsert({
          user_id: user.id,
          username: redditUser.name,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
          client_id: import.meta.env.VITE_REDDIT_APP_ID,
          client_secret: import.meta.env.VITE_REDDIT_APP_SECRET,
          scope: tokens.scope.split(' '),
          is_active: true,
          last_used_at: new Date().toISOString(),
          // Karma breakdown
          karma_score: (redditUser.link_karma || 0) + (redditUser.comment_karma || 0),
          link_karma: redditUser.link_karma || 0,
          comment_karma: redditUser.comment_karma || 0,
          awardee_karma: redditUser.awardee_karma || 0,
          awarder_karma: redditUser.awarder_karma || 0,
          total_karma: redditUser.total_karma || 0,
          // Profile data
          avatar_url: redditUser.icon_img?.split('?')[0] || redditUser.snoovatar_img || null,
          is_gold: redditUser.is_gold || false,
          is_mod: redditUser.is_mod || false,
          verified: redditUser.verified || false,
          // Account stats
          created_utc: new Date(redditUser.created_utc * 1000).toISOString(),
          has_verified_email: redditUser.has_verified_email || false,
          // Activity tracking
          last_post_check: new Date().toISOString(),
          last_karma_check: new Date().toISOString(),
          posts_today: 0,
          total_posts: 0,
          // Update timestamps
          updated_at: new Date().toISOString(),
          // Rate limiting
          rate_limit_remaining: 60,
          rate_limit_reset: new Date(Date.now() + 60 * 1000).toISOString() // 1 minute from now
        }, {
          onConflict: 'user_id,username'
        });

      if (dbError) {
        throw dbError;
      }

      // Clean up state from session storage
      sessionStorage.removeItem('reddit_oauth_state');

      // After successfully storing the account, refresh the account status
      await refreshAccountStatus();
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error during OAuth callback:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    }
  }, [code, state, urlError, user, navigate, refreshAccountStatus, exchangeAttempted]);

  useEffect(() => {
    let isMounted = true;
    
    if (user && !exchangeAttempted && isMounted) {
      handleCallback();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, handleCallback, exchangeAttempted]);

  // Create a memoized navigation handler
  const handleBackToAccounts = useCallback(() => {
    navigate('/accounts');
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={handleBackToAccounts}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200"
          >
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="animate-spin text-5xl mb-4">⚙️</div>
        <h1 className="text-2xl font-bold text-white mb-4">Connecting Your Reddit Account</h1>
        <p className="text-gray-300">Please wait while we authenticate your Reddit account...</p>
      </div>
    </div>
  );
}