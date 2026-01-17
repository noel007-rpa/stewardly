# Supabase Client Debug Verification

## Overview

The Supabase client has been enhanced with production debug logging to help identify initialization, session management, and configuration issues.

## What Changed

### Session Persistence Configuration

**Before:**
```typescript
persistSession: false // Manual session handling
```

**After:**
```typescript
persistSession: true // Supabase handles persistence with custom storage

storage: {
  getItem: (key) => localStorage.getItem(`stewardly_supabase_${key}`),
  setItem: (key, value) => localStorage.setItem(`stewardly_supabase_${key}`, value),
  removeItem: (key) => localStorage.removeItem(`stewardly_supabase_${key}`),
}
```

### Storage Key Prefix

All Supabase session data now uses `stewardly_supabase_` prefix for easy identification:
- `stewardly_supabase_auth.session`
- `stewardly_supabase_auth.expires_at`
- `stewardly_supabase_auth.refresh_token`

This separates Supabase session storage from Stewardly app data storage.

## Debug Logging

### Console Output (Development Only)

When running `npm run dev`, you'll see debug logs in the browser console:

```
[Supabase] Initializing with URL: https://your-project.supabase.co...
[Supabase] Client initialized successfully
[Supabase] Storing session key: auth.session
[Supabase] Retrieved session key: auth.session found
[Supabase] Removing session key: auth.session
```

These logs are **only visible in development** (`import.meta.env.DEV`). They do NOT appear in production builds.

## Verification Steps

### 1. Check for Duplicate Clients

**Search Result:** ✅ **ONE Supabase client found**

```bash
grep -r "createClient" src/ --include="*.ts" --include="*.tsx"
```

Result:
```
src/api/supabaseClient.ts:1:    import { createClient } from "@supabase/supabase-js";
src/api/supabaseClient.ts:26:   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
```

**Conclusion:** Only one Supabase client is initialized (correct).

### 2. Verify Environment Variables at Runtime

1. Set up `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. Run dev server:
   ```bash
   npm run dev
   ```

3. Open browser DevTools (F12) → Console tab

4. On app load, you should see:
   ```
   [Supabase] Initializing with URL: https://your-project.supabase.co...
   [Supabase] Client initialized successfully
   ```

### 3. Verify Session Storage Keys

1. Sign in to Stewardly

2. Open DevTools → Application → LocalStorage

3. Look for keys starting with `stewardly_supabase_`:
   ```
   stewardly_supabase_auth.session (large JSON)
   stewardly_supabase_auth.expires_at
   stewardly_supabase_auth.refresh_token (if applicable)
   ```

4. Also verify existing Stewardly keys are still there:
   ```
   stewardly_distribution_plans
   stewardly_active_plan_id
   stewardly_income
   stewardly_transactions
   stewardly_user (from sessionStore)
   stewardly_access_token (from sessionStore)
   ```

### 4. Verify Single Client Import

Search for all Supabase imports:

```bash
grep -r "from.*supabase" src/ --include="*.ts" --include="*.tsx"
```

Expected result:
```
src/api/supabaseClient.ts:1:    import { createClient } from "@supabase/supabase-js";
src/hooks/useAuth.ts:2:          import { supabase } from "../api/supabaseClient";
```

**Verification:** 
- ✅ Only ONE file imports `createClient` (supabaseClient.ts)
- ✅ All other files import the singleton `supabase` object (useAuth.ts)
- ✅ No duplicate client initializations

## Debug Logs in Action

### Sign Up Flow
```
[Supabase] Initializing with URL: https://your-project.supabase.co...
[Supabase] Client initialized successfully
User fills form and clicks "Sign up"
(No logs - sign up happens server-side at Supabase)
User checks email for confirmation link
```

### Sign In Flow
```
[Supabase] Storing session key: auth.session
[Supabase] Storing session key: auth.expires_at
[Supabase] Storing session key: auth.refresh_token
✓ Dashboard loads with user data
```

### Page Refresh (Session Restore)
```
[Supabase] Client initialized successfully
[Supabase] Retrieved session key: auth.session found
[Supabase] Retrieved session key: auth.expires_at found
[Supabase] Retrieved session key: auth.refresh_token found
✓ User stays logged in - no re-login needed!
```

### Sign Out Flow
```
[Supabase] Removing session key: auth.session
[Supabase] Removing session key: auth.expires_at
[Supabase] Removing session key: auth.refresh_token
✓ Redirects to login page
```

## Troubleshooting

### Missing Environment Variables

If you see this error:
```
Error: Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

**Solution:**
1. Create `.env.local` in project root
2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Restart dev server: `npm run dev`

### No Debug Logs Appearing

**Check:**
1. Are you running in development? (`npm run dev`)
   - Debug logs only appear in dev, not in production builds
2. Is DevTools Console open? (F12 → Console tab)
3. Are there any errors preventing app load? (check Console for red errors)

### Session Not Persisting After Refresh

**Check:**
1. Verify `stewardly_supabase_auth.session` exists in localStorage
2. Check if browser localStorage is enabled
3. Look for any errors in the console
4. Clear all `stewardly_*` keys and try signing in again

### Multiple Supabase Clients Found

**If this ever happens:**
```bash
grep -r "createClient" src/ --include="*.ts" --include="*.tsx"
# Should return ONLY src/api/supabaseClient.ts:26
```

If you find multiple, consolidate them into a single client.

## Storage Architecture

```
localStorage
├── Stewardly App Data (MVP-frozen, canonical keys)
│   ├── stewardly_distribution_plans
│   ├── stewardly_active_plan_id
│   ├── stewardly_income
│   ├── stewardly_transactions
│   ├── stewardly_period_locks
│   ├── stewardly_period_plan_snapshots
│   ├── stewardly_release_readiness
│   ├── stewardly_release_checklist
│   ├── stewardly_user (sessionStore)
│   └── stewardly_access_token (sessionStore)
│
└── Supabase Session Data (separate namespace)
    ├── stewardly_supabase_auth.session
    ├── stewardly_supabase_auth.expires_at
    └── stewardly_supabase_auth.refresh_token (if applicable)
```

## Production Build Behavior

In production (`npm run build && npm run preview`):
- ✅ Debug logs are **completely removed** (no console spam)
- ✅ Session persistence still works (storage config enabled)
- ✅ All authentication features work normally
- ✅ Smaller bundle size (debug code stripped)

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| Supabase Clients | ✅ Single | Only `src/api/supabaseClient.ts` initializes |
| Session Persistence | ✅ Enabled | `persistSession: true` with custom storage |
| Storage Prefix | ✅ Isolated | `stewardly_supabase_*` for Supabase session data |
| Debug Logging | ✅ Dev-only | Console logs in dev, removed in production |
| Environment Validation | ✅ Early | Throws error if env vars missing at init time |
| Session Key Visibility | ✅ High | All session ops logged (dev mode) for debugging |

---

**Last Updated:** January 18, 2026  
**Build Status:** ✅ Passes (0 errors)
