/**
 * Auth Hooks - React integration for auth store
 */

import React from 'react';
import { useRef, useEffect } from 'react';
import { useAuthStore } from '../store/index.js';
import { supabase } from '../lib/supabase.js';

/**
 * Hook to access auth state and actions
 */
export function useAuth() {
  const {
    user,
    session,
    profile,
    plan,
    preferences,
    loading,
    init,
    refresh,
    signOut,
    updateProfile,
    setPlan,
  } = useAuthStore();

  return {
    // State
    user,
    session,
    profile,
    plan,
    preferences,
    loading,
    isAuthenticated: !!session,

    // Actions
    init,
    refresh,
    signOut,
    updateProfile,
    setPlan,
  };
}

/**
 * Hook that initializes auth on mount
 */
export function useAuthInit() {
  const { init, loading } = useAuthStore();

  // Initialize once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    init();
  }

  return { loading };
}


/**
 * Hook for Supabase Auth UI helpers
 */
export function useSupabaseAuth() {
  const { refresh } = useAuthStore();

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refresh();
    return data;
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    // Note: profile created via trigger, user may need email confirmation
    return data;
  };

  const signInWithOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    refresh(); // Will clear state
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    await refresh();
  };

  return {
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
  };
}

/**
 * Hook for protected routes - redirects if not authenticated
 */
export function useRequireAuth(navigate, redirectTo = '/login') {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  return { isAuthenticated, loading };
}
