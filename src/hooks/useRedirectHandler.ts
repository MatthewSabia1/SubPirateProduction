import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Hook to handle authentication redirects, focusing on Google OAuth
 */
export const useRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        console.log('Checking for authentication redirects...');
        // Get current URL hash
        const currentHash = window.location.hash;
        const currentPathname = location.pathname;
        
        // Early return if we're already at the callback URL to prevent loops
        if (currentPathname === '/auth/callback') {
          console.log('Already at callback URL, not redirecting');
          return;
        }

        // Check if there's a hash in the URL that contains oauth authentication params
        if (currentHash && (
            currentHash.includes('access_token=') || 
            currentHash.includes('error=') || 
            currentHash.includes('code=')
        )) {
          console.log('Authentication parameters detected in URL hash');
          
          // We're coming back from an OAuth provider (likely Google)
          // Store the hash in sessionStorage for the callback component
          console.log('Storing hash in sessionStorage for the callback component');
          sessionStorage.setItem('supabase-auth-hash', currentHash);
          
          // Redirect to callback URL
          const basePath = window.location.origin; 
          const callbackPath = '/auth/callback';
          const cleanCallbackUrl = `${basePath}${callbackPath}`;
          
          console.log(`Redirecting to callback URL: ${cleanCallbackUrl}`);
          
          // Use replace instead of navigate for cleaner history
          window.location.replace(cleanCallbackUrl);
          return;
        }
        
        // Check if we already have a session and are at root path
        if (currentPathname === '/') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('User is already authenticated, redirecting to dashboard');
            navigate('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error in redirect handler:', error);
      }
    })();
  }, [navigate, location]);
};