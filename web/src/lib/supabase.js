/**
 * Supabase Client - Singleton instance
 * Clean-room: no hardcoded keys, uses Vite env vars
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Re-export for convenience
export { createClient };
export { supabase };
export default supabase;
