import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for authentication only.
 *
 * IMPORTANT: This client is configured for email/password authentication only.
 * No database operations or backend logic should be performed here.
 * All data persistence remains in localStorage (MVP-frozen).
 *
 * For future v1.1+ backend integration:
 * - Add database schema definitions (profiles table, etc.)
 * - Implement data sync logic separate from auth
 * - Keep auth flow independent of storage decisions
 * - Consider migration strategy for existing localStorage data
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // We handle session persistence in SessionStore
  },
});

/**
 * Future backend integration notes:
 * - Session token should be validated against backend on app start
 * - Consider adding refresh token rotation
 * - RLS (Row Level Security) policies not needed until database is added
 * - Profile data should sync only after schema is defined
 */
