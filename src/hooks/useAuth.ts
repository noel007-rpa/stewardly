import { useCallback, useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { setSession, clearSession, getSession, type StewardlyUser } from "../state/sessionStore";

/**
 * Auth state returned by useAuth hook
 */
export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StewardlyUser | null;
  error: string | null;
};

/**
 * useAuth hook for managing Supabase authentication
 *
 * Responsibilities:
 * - Handle user login with email/password
 * - Handle user logout
 * - Restore session from localStorage on app mount
 * - Persist session to localStorage after login
 * - Clear session on logout or auth errors
 *
 * IMPORTANT: This hook does NOT manage any data sync or backend integration.
 * All Stewardly data (plans, transactions, etc.) remains in localStorage (MVP-frozen).
 *
 * For future v1.1+ backend integration:
 * - Add data sync logic in separate hooks/services
 * - Keep auth and data persistence independent
 * - Consider polling for session validity
 * - Implement refresh token rotation if needed
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  /**
   * Restore session from localStorage on component mount.
   * This runs once per app lifecycle.
   */
  useEffect(() => {
    const session = getSession();
    if (session.accessToken && session.user) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: session.user,
        error: null,
      });
    } else {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    }
  }, []);

  /**
   * Sign up a new user with email and password
   * Stores session in localStorage for persistence
   */
  const signUp = useCallback(
    async (email: string, password: string) => {
      setState({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard/cashflow`,
          },
        });

        if (error) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: error.message,
          });
          return { success: false, error: error.message };
        }

        if (!data.user) {
          const msg = "Sign up failed: no user returned";
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: msg,
          });
          return { success: false, error: msg };
        }

        // Sign up successful - still need user to confirm email or auto-login
        // Transition to login to complete auth flow
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });

        return {
          success: true,
          message:
            "Sign up successful. Please check your email to confirm your account.",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed";
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: message,
        });
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Sign in with email and password
   * Stores session in localStorage for persistence
   * Creates Stewardly user object from Supabase session
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setState({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
      });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: error.message,
          });
          return { success: false, error: error.message };
        }

        if (!data.user || !data.session) {
          const msg = "Sign in failed: no session returned";
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: msg,
          });
          return { success: false, error: msg };
        }

        // Create Stewardly user object from Supabase auth
        const stewardlyUser: StewardlyUser = {
          user_id: data.user.id,
          email: data.user.email || email,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferred_currency: "SGD", // Default, can be updated later
        };

        // Persist to localStorage
        setSession(data.session.access_token, stewardlyUser);

        setState({
          isAuthenticated: true,
          isLoading: false,
          user: stewardlyUser,
          error: null,
        });

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: message,
        });
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Sign out and clear session
   * Removes session from localStorage
   */
  const signOut = useCallback(async () => {
    try {
      // Sign out from Supabase (invalidates server-side session)
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase sign out error:", err);
      // Continue with local logout even if Supabase call fails
    } finally {
      // Clear local session regardless of Supabase call
      clearSession();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    }
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}

/**
 * Future backend integration planning:
 *
 * v1.1 Phase (Database Integration):
 * - Create profiles table in Supabase
 * - Add user profile sync in separate hook
 * - Keep auth flow unchanged
 * - Migrate localStorage data separately from auth
 *
 * Session validation:
 * - Consider validating token on app start
 * - Check token expiration before navigation
 * - Refresh token if needed
 *
 * Error handling:
 * - Distinguish between auth errors and network errors
 * - Implement retry logic for transient failures
 * - Log auth events for debugging
 */
