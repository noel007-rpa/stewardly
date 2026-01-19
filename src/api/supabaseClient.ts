import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for authentication only.
 *
 * IMPORTANT: This client is configured for email/password authentication only.
 * No database operations or backend logic should be performed here.
 * All data persistence remains in localStorage (MVP-frozen).
 *
 * API Key Strategy:
 * - Uses PUBLISHABLE key (not legacy anon key)
 * - Publishable keys are the recommended approach for SPAs
 * - Provides better security model: scoped permissions per user
 * - Cannot be revoked; instead create new key with updated RLS policies
 * - Safe to expose in frontend code (by design)
 * - Secret/service_role keys must NEVER be exposed in frontend
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
    "Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key)"
  );
}

// Production debug log to verify environment configuration at runtime
if (import.meta.env.DEV) {
  console.debug(
    "[Supabase] Initializing with URL:",
    supabaseUrl?.substring(0, 30) + "..." // Log truncated URL for privacy
  );
  console.debug(
    "[Supabase] Using publishable key (frontend-safe, no backend access)"
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
 * Why Publishable Keys for Frontend:
 *
 * Publishable Key (Recommended for SPA):
 * ✅ Safe to expose in frontend code
 * ✅ Scoped permissions via RLS (Row Level Security)
 * ✅ Per-user data isolation through auth context
 * ✅ Cannot perform unrestricted database operations
 * ✅ Follows modern security best practices
 * ✅ Can be rotated by updating RLS policies
 *
 * Legacy Anon Key (Old approach - avoid):
 * ❌ Was acceptable in old Supabase projects
 * ❌ Less restrictive permission model
 * ❌ Harder to revoke (requires key rotation)
 * ❌ Supabase recommends migrating away from anon keys
 *
 * Secret/Service Role Keys (NEVER use in frontend):
 * ❌ Unrestricted database access
 * ❌ Bypasses RLS policies
 * ❌ Can modify all data regardless of ownership
 * ❌ Must ONLY be used server-side
 * ❌ If exposed, compromises entire database
 *
 * Current Implementation:
 * - Frontend: Publishable key (safe, scoped)
 * - Backend (when added): Secret key server-side only
 * - No backend currently (MVP v1.0)
 */
