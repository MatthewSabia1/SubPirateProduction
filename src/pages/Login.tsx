import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/dashboard', { replace: true });
      } else {
        const result = await signUp(email, password);
        if (result.user) {
          // Redirect to subscription page for new users
          navigate('/subscription', { 
            replace: true,
            state: { newUser: true, email: email }
          });
        } else {
          // If user is null, it likely means confirmation email was sent
          setError('Account created! Please check your email to confirm your account, then you can sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      console.log('Starting Google authentication process...');
      const { url } = await signInWithGoogle() || { url: null };
      
      if (url) {
        console.log('Google OAuth URL received, redirecting...');
        // URL redirection will be handled by Supabase automatically
        // No need to call window.location.href = url
      } else {
        console.error('No redirect URL received from Supabase');
        setError('Authentication failed: No redirect URL received');
        setGoogleLoading(false);
      }
      // Note: No navigate here as OAuth flow will handle redirection
    } catch (err) {
      console.error('Google auth error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google authentication failed. Please try again.');
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="xl" className="mb-4" />
        </div>

        <div className="bg-[#0f0f0f] rounded-lg p-6 text-[#ffffff]">
          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 text-center ${isLogin ? 'border-b-2 border-[#C69B7B]' : 'text-gray-500'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 text-center ${!isLogin ? 'border-b-2 border-[#C69B7B]' : 'text-gray-500'}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-1">
            {isLogin ? 'Login' : 'Create an account'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isLogin ? 'Sign in to your account' : 'Sign up for a new account'}
          </p>

          {error && (
            <div className="bg-red-900/50 text-red-400 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium">Password</label>
                {isLogin && (
                  <a href="#" className="text-sm text-gray-400 hover:text-white" tabIndex={-1}>
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C69B7B]"
              />
            </div>

            <button 
              type="submit" 
              className="primary w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#333333]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0f0f0f] text-gray-400">
                  OR CONTINUE WITH
                </span>
              </div>
            </div>

            <button 
              type="button"
              className="secondary w-full flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                'Connecting...'
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                    </g>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;