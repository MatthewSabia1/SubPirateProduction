import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with specific configuration for data storage only
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials are required. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // Disable Supabase auth features since we're using Clerk
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'x-application-name': 'subpirate',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'X-Client-Info': 'web-browser-chrome'
    },
  },
  realtime: {
    timeout: 30000, // Increase timeout for realtime connections
  }
});

// Export Supabase client as default
export default supabase;