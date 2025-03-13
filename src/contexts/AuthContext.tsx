import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  image_url: string | null;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (data: { display_name?: string }) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  return (
    <AuthProviderInner>
      {children}
    </AuthProviderInner>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    async function syncUserToSupabase() {
      if (clerkUser) {
        try {
          // Create or update profile in Supabase
          const { data, error } = await supabase
            .from('profiles')
            .upsert({
              id: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              display_name: clerkUser.fullName || clerkUser.username,
              image_url: clerkUser.imageUrl,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            .select()
            .single();

          if (error) throw error;
          setProfile(data);
        } catch (err) {
          console.error('Error syncing user to Supabase:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    syncUserToSupabase();
  }, [clerkUser, isLoaded]);

  const signIn = async (email: string, password: string) => {
    return clerk.signIn.create({
      identifier: email,
      password
    });
  };

  const signUp = async (email: string, password: string) => {
    return clerk.signUp.create({
      emailAddress: email,
      password
    });
  };

  const signOut = async () => {
    await clerk.signOut();
  };

  const signInWithGoogle = async () => {
    return clerk.signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/auth/callback",
      redirectUrlComplete: "/dashboard"
    });
  };

  const updateProfile = async (data: { display_name?: string }) => {
    if (!clerkUser) throw new Error('No user logged in');

    try {
      // Update Clerk profile
      await clerkUser.update({
        firstName: data.display_name
      });

      // Sync to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', clerkUser.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user: clerkUser,
      profile,
      loading: !isLoaded || loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}