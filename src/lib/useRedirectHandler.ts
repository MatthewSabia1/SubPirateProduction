import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        // Get current URL hash
        const currentHash = window.location.hash;
        const currentPathname = location.pathname;
        
        // Early return if we're already at the callback URL to prevent loops
        if (currentPathname === '/auth/callback') {
          return;
        }

        // Check if there's a hash in the URL that contains oauth authentication params
        if (currentHash && (
            currentHash.includes('access_token=') || 
            currentHash.includes('error=') || 
            currentHash.includes('code=')
        )) {
          // Store the hash in sessionStorage for the callback component
          sessionStorage.setItem('supabase-auth-hash', currentHash);
          
          // Redirect to callback URL
          const basePath = window.location.origin; 
          const callbackPath = '/auth/callback';
          const cleanCallbackUrl = `${basePath}${callbackPath}`;
          
          // Use replace instead of navigate for cleaner history
          window.location.replace(cleanCallbackUrl);
          return;
        }
        
        // Check if we already have a session and are at root path
        if (currentPathname === '/') {
          if (user) {
            navigate('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error in redirect handler:', error);
      }
    })();
  }, [navigate, location, user]);
};