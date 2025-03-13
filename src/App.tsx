import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { FeatureAccessProvider } from './contexts/FeatureAccessContext';
import { RedditAccountProvider, useRedditAccounts } from './contexts/RedditAccountContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import SubredditAnalysis from './pages/SubredditAnalysis';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import ProjectView from './pages/ProjectView';
import SavedList from './pages/SavedList';
import SpyGlass from './pages/SpyGlass';
import RedditAccounts from './pages/RedditAccounts';
import RedditOAuthCallback from './pages/RedditOAuthCallback';
import AuthCallback from './pages/AuthCallback';
import Pricing from './pages/Pricing';
import SubscriptionPage from './pages/SubscriptionPage';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import { Menu } from 'lucide-react';
import { useRedirectHandler } from './lib/useRedirectHandler';
import Admin from './pages/Admin';
import TestWebhook from './pages/TestWebhook';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { refreshAccountStatus, isLoading: redditAccountsLoading } = useRedditAccounts();
  const [hasCheckedAccounts, setHasCheckedAccounts] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const persistedCheckoutSuccess = localStorage.getItem('checkout_success') === 'true';
    const checkoutParam = urlParams.get('checkout');
    const hasCheckoutSuccessParam = 
      checkoutParam === 'success' || 
      window.location.search.includes('checkout=success');

    if (hasCheckoutSuccessParam || persistedCheckoutSuccess) {
      if (hasCheckoutSuccessParam) {
        localStorage.setItem('checkout_success', 'true');
        localStorage.setItem('checkout_success_time', new Date().toISOString());
      }
      setIsCheckoutSuccess(true);
      setHasSubscription(true);
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !redditAccountsLoading && !hasCheckedAccounts) {
      refreshAccountStatus();
      setHasCheckedAccounts(true);
    }
  }, [user, redditAccountsLoading, refreshAccountStatus, hasCheckedAccounts]);

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading</h1>
          <p className="mb-4">Please wait while we verify your account...</p>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const urlHasCheckoutSuccess = 
    new URLSearchParams(window.location.search).get('checkout') === 'success' || 
    window.location.search.includes('checkout=success');
  const persistedCheckoutSuccess = localStorage.getItem('checkout_success') === 'true';

  if (!hasSubscription && 
      !isCheckoutSuccess && 
      !urlHasCheckoutSuccess &&
      !persistedCheckoutSuccess &&
      window.location.pathname !== '/subscription' &&
      !window.location.pathname.startsWith('/auth/callback') &&
      !window.location.pathname.startsWith('/auth/reddit/callback')) {
    return <Navigate to="/subscription" state={{ newUser: false }} replace />;
  }

  return (
    <div className="flex">
      <Sidebar isMobileOpen={isSidebarOpen} onMobileClose={() => setIsSidebarOpen(false)} />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#111111] border-b border-[#333333] md:hidden z-10 flex items-center px-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10"
        >
          <Menu size={24} />
        </button>
      </div>
      
      <main className="flex-1 md:ml-[240px] p-4 md:p-8 mt-16 md:mt-0 bg-[#111111] min-h-screen">
        {children}
      </main>
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="mb-4 text-red-400">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!clerkPubKey) {
    console.error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
          <p className="text-red-400 mb-4">Missing Clerk authentication configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ClerkProvider publishableKey={clerkPubKey}>
        <AuthProvider>
          <FeatureAccessProvider>
            <QueryClientProvider client={queryClient}>
              <Router>
                <RedditAccountProvider>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth/reddit/callback" element={
                      <PrivateRoute>
                        <RedditOAuthCallback />
                      </PrivateRoute>
                    } />
                    <Route path="/dashboard" element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    } />
                    <Route path="/saved" element={
                      <PrivateRoute>
                        <SavedList />
                      </PrivateRoute>
                    } />
                    <Route path="/settings" element={
                      <PrivateRoute>
                        <Settings />
                      </PrivateRoute>
                    } />
                    <Route path="/analytics" element={
                      <PrivateRoute>
                        <Analytics />
                      </PrivateRoute>
                    } />
                    <Route path="/analysis/:subreddit" element={
                      <PrivateRoute>
                        <SubredditAnalysis />
                      </PrivateRoute>
                    } />
                    <Route path="/projects" element={
                      <PrivateRoute>
                        <Projects />
                      </PrivateRoute>
                    } />
                    <Route path="/projects/:projectId" element={
                      <PrivateRoute>
                        <ProjectView />
                      </PrivateRoute>
                    } />
                    <Route path="/calendar" element={
                      <PrivateRoute>
                        <Calendar />
                      </PrivateRoute>
                    } />
                    <Route path="/spyglass" element={
                      <PrivateRoute>
                        <SpyGlass />
                      </PrivateRoute>
                    } />
                    <Route path="/accounts" element={
                      <PrivateRoute>
                        <RedditAccounts />
                      </PrivateRoute>
                    } />
                    <Route path="/admin" element={
                      <PrivateRoute>
                        <Admin />
                      </PrivateRoute>
                    } />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/test-webhook" element={
                      <PrivateRoute>
                        <TestWebhook />
                      </PrivateRoute>
                    } />
                  </Routes>
                </RedditAccountProvider>
              </Router>
            </QueryClientProvider>
          </FeatureAccessProvider>
        </AuthProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

export default App;