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

// Production debug log to verify environment configuration at runtime
if (import.meta.env.DEV) {
  console.debug(
    "[Supabase] Initializing with URL:",
    supabaseUrl?.substring(0, 30) + "..." // Log truncated URL for privacy
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // Supabase handles session persistence to localStorage
    storage: {
      getItem: (key: string) => {
        const item = localStorage.getItem(`stewardly_supabase_${key}`);
        if (import.meta.env.DEV) {
          console.debug(`[Supabase] Retrieved session key: ${key}`, item ? "found" : "not found");
        }
        return item;
      },
      setItem: (key: string, value: string) => {
        if (import.meta.env.DEV) {
          console.debug(`[Supabase] Storing session key: ${key}`);
        }
        localStorage.setItem(`stewardly_supabase_${key}`, value);
      },
      removeItem: (key: string) => {
        if (import.meta.env.DEV) {
          console.debug(`[Supabase] Removing session key: ${key}`);
        }
        localStorage.removeItem(`stewardly_supabase_${key}`);
      },
    },
  },
});

// Log successful initialization
if (import.meta.env.DEV) {
  console.debug("[Supabase] Client initialized successfully");
}

/**
 * Future backend integration notes:
 * - Session token should be validated against backend on app start
 * - Consider adding refresh token rotation
 * - RLS (Row Level Security) policies not needed until database is added
 * - Profile data should sync only after schema is defined
 */
