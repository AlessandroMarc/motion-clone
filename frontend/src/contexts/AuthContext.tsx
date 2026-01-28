'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Schedule } from '@/types';
import { userSettingsService } from '@/services/userSettingsService';
import posthog from 'posthog-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeSchedule: Schedule | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);

  // Load active schedule when user changes
  useEffect(() => {
    const loadActiveSchedule = async (userId: string) => {
      try {
        const schedule = await userSettingsService.getActiveSchedule(userId);
        setActiveSchedule(schedule);
      } catch (error) {
        console.error('Failed to load active schedule:', error);
        // Set default schedule on error
        setActiveSchedule({
          id: '',
          user_id: userId,
          name: 'Default',
          working_hours_start: 9,
          working_hours_end: 22,
          is_default: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    };

    if (user?.id) {
      loadActiveSchedule(user.id);
    } else {
      setActiveSchedule(null);
    }
  }, [user]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // PostHog: Identify user on sign-in
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
        });
        posthog.capture('user_signed_in', {
          auth_provider: 'google',
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        console.error('Error signing in with Google:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // PostHog: Capture sign-out event before resetting
      posthog.capture('user_signed_out');
      posthog.reset();

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    activeSchedule,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
