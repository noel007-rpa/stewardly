# Supabase Authentication Integration

**Date:** January 17, 2026  
**Status:** Integrated with v1.0.0  
**Scope:** Email/password authentication only (no database)  

---

## Overview

Stewardly v1.0.0 now uses Supabase for user authentication while maintaining 100% local data persistence through MVP freeze-protected localStorage.

### Key Principles

✅ **Authentication:** Supabase email/password  
✅ **Data Storage:** localStorage (unchanged, MVP-frozen)  
✅ **Backward Compatibility:** No data loss or migration needed  
✅ **Future-Ready:** Architecture supports v1.1+ backend integration  

---

## Architecture

### Authentication Flow

```
User Login
    ↓
Supabase.auth.signInWithPassword()
    ↓
Generate JWT access token
    ↓
Create StewardlyUser object
    ↓
Persist to localStorage (sessionStore)
    ↓
Restore on app reload
    ↓
Gate app routes behind ProtectedRoute
```

### File Structure

```
src/
├── api/
│   └── supabaseClient.ts          # Supabase client initialization
├── hooks/
│   └── useAuth.ts                 # Auth hook (signIn, signUp, signOut)
├── pages/
│   └── auth/
│       └── Login.tsx              # Updated login (replaced demo)
├── app/
│   ├── providers.tsx              # AuthProvider wrapper (extensible)
│   ├── ProtectedRoute.tsx         # Route protection (unchanged logic)
│   └── routes.tsx                 # Auth-gated routes (unchanged)
├── state/
│   └── sessionStore.ts            # localStorage persistence (unchanged)
├── config/
│   └── mvp.ts                     # MVP freeze (unchanged, still active)
└── .env.example                   # Supabase configuration template
```

### Session Persistence

```
Browser Storage:
  └── localStorage
      ├── stewardly_access_token        (JWT from Supabase)
      ├── stewardly_user                (StewardlyUser object)
      ├── stewardly_distribution_plans  (MVP-frozen)
      ├── stewardly_income              (MVP-frozen)
      ├── stewardly_transactions        (MVP-frozen)
      └── [other MVP keys...]           (MVP-frozen)
```

**Session Persistence:**
- User login → Access token stored in localStorage
- Page reload → Session restored from localStorage
- User logout → Session cleared, redirect to login

---

## Setup Instructions

### Prerequisites

- Supabase account (https://supabase.com)
- Stewardly repo cloned locally

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project (any region)
3. Wait for project to initialize (2-3 minutes)

### 2. Get API Credentials

1. Open Project Settings → API
2. Copy **Project URL** (e.g., `https://your-project.supabase.co`)
3. Copy **Anon/Public Key** (NOT the service role key)

### 3. Configure Environment Variables

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ Important:** These are PUBLIC keys - they should NOT contain any secrets.

### 4. Enable Email Authentication

In Supabase Console:

1. Go to Authentication → Providers
2. Make sure "Email" is enabled
3. Configure email confirmation (optional):
   - For dev: disable "Confirm email" or use "Allow user signup"
   - For prod: enable "Confirm email" and configure SMTP

### 5. Install Dependencies

```bash
npm install
```

Dependencies added:
- `@supabase/supabase-js` - Supabase JS client

### 6. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 → you'll see the login page

### 7. Create Test Account

1. Click "Need an account? Sign up"
2. Enter email and password
3. Create account (email confirmation skipped if disabled in Supabase)
4. Sign in with your new account
5. You're in! Existing localStorage data auto-loads

---

## API Reference

### `useAuth()` Hook

```typescript
import { useAuth } from "../hooks/useAuth";

export function MyComponent() {
  const {
    isAuthenticated,    // boolean
    isLoading,          // boolean (during auth operations)
    user,               // StewardlyUser | null
    error,              // string | null
    signIn,             // async (email, password) => Promise
    signUp,             // async (email, password) => Promise
    signOut,            // async () => void
  } = useAuth();

  // Your component code
}
```

### Example Usage

**Sign In:**
```typescript
const { signIn } = useAuth();
const result = await signIn("user@example.com", "password");
if (result.success) {
  navigate("/dashboard/cashflow");
}
```

**Sign Out:**
```typescript
const { signOut } = useAuth();
await signOut();
navigate("/login");
```

**Check Auth State:**
```typescript
const { isAuthenticated, user } = useAuth();
if (isAuthenticated) {
  console.log("Logged in as:", user?.email);
}
```

### `supabase` Client

```typescript
import { supabase } from "../api/supabaseClient";

// For future use - currently auth-only
const { data, error } = await supabase.auth.getSession();
```

---

## Data Persistence

### Current (v1.0.0)

✅ **User Session:** Supabase JWT + localStorage  
✅ **Plans:** localStorage (MVP-frozen)  
✅ **Transactions:** localStorage (MVP-frozen)  
✅ **Income:** localStorage (MVP-frozen)  
✅ **Net Worth:** localStorage (MVP-frozen)  

### Authentication Storage Keys

```typescript
// Read/written by useAuth hook
"stewardly_access_token"   // JWT access token from Supabase
"stewardly_user"           // StewardlyUser JSON

// These keys are PROTECTED by MVP freeze
// (cannot add new stewardly_* keys without unfreezing v1.0)
```

### MVP Freeze Behavior

When `STEWARDLY_MVP_FROZEN = true`:

- ❌ Cannot create new `stewardly_*` keys
- ❌ Cannot remove canonical keys
- ✅ Can read/modify existing MVP-frozen keys
- ✅ Authentication works normally

**To unfreeze for v1.1:**
1. Edit `src/config/mvp.ts` → `STEWARDLY_MVP_FROZEN = false`
2. Update version in `package.json`
3. You can now add new storage keys

---

## Future: Backend Integration (v1.1+)

### When to Add Database

When you need:
- Cloud backup
- Multi-device sync
- Real-time collaboration
- Audit logging
- Data security compliance

### Migration Path

**Current Architecture (v1.0):**
```
Supabase Auth → localStorage → Browser only
```

**Future Architecture (v1.1+):**
```
Supabase Auth ↔ Supabase DB ← optional sync
       ↓
localStorage (still works offline)
```

### Implementation Notes for v1.1

1. **Create Database Schema** (when ready):
   ```sql
   -- Example - design as needed
   CREATE TABLE profiles (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     email TEXT,
     timezone TEXT,
     created_at TIMESTAMP
   );
   ```

2. **Keep Auth Unchanged:**
   - useAuth hook remains the same
   - Session persistence stays in localStorage
   - ProtectedRoute logic unchanged

3. **Add Data Sync (separate hooks):**
   ```typescript
   // NEW hook for data sync (v1.1+)
   export function useSyncPlan() {
     // Sync plan to backend when MVP unfrozen
   }
   ```

4. **Offline-First Strategy:**
   - Write to localStorage first (fast)
   - Sync to backend in background
   - Conflict resolution as needed
   - MVP freeze prevents breaking this model

### Database: RLS (Row Level Security)

Once database is added, configure RLS:

```sql
-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Troubleshooting

### "Missing Supabase environment variables"

**Error:** `Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY`

**Solution:**
1. Check `.env.local` exists in project root
2. Verify variable names exactly match (case-sensitive)
3. Restart dev server after adding .env.local
4. Rebuild: `npm run build`

### "Sign in failed"

**Common causes:**
1. Email not registered - click "Need an account? Sign up"
2. Password wrong - check caps lock
3. Supabase project not initialized - check Supabase console
4. Email confirmation required - check Supabase auth settings

### "Session lost on refresh"

**This is expected if:**
- localStorage is disabled in browser
- Incognito/private mode (clears on close)
- clearSession() called in code

**Fix:**
- Run in normal (non-incognito) mode
- Check localStorage is enabled

### "Can't create new storage keys"

**This is expected!** MVP freeze is active:
```
[MVP Freeze] Cannot create new localStorage key "stewardly_new_key"
- Stewardly v1.0 is frozen. To add new keys, increment version 
  and set STEWARDLY_MVP_FROZEN = false in src/config/mvp.ts
```

**To continue development:**
1. Edit `src/config/mvp.ts` → set `STEWARDLY_MVP_FROZEN = false`
2. Update version in `package.json`
3. Try your new key again

---

## Security Notes

### What's Public?

✅ Supabase URL (everyone can see this)  
✅ Anon/Public Key (everyone can see this)  
❌ Service Role Key (NEVER expose this)  

### Why This is Safe

- Supabase anon key is intentionally public
- It can only call auth functions
- RLS (Row Level Security) protects data
- No passwords stored in frontend code

### Best Practices

- ✅ Store env vars in `.env.local` (never commit)
- ✅ Use `.env.example` to document required vars
- ✅ When adding backend: implement RLS immediately
- ❌ Never commit `.env.local` or actual credentials
- ❌ Never use service role key in frontend

---

## Testing Checklist

- [ ] Dev server starts: `npm run dev`
- [ ] Login page loads at http://localhost:5173/login
- [ ] Sign up creates new account
- [ ] Sign in with valid credentials works
- [ ] Invalid credentials show error
- [ ] After login, localStorage has access token
- [ ] Navigation to `/dashboard/cashflow` works
- [ ] Existing plans/transactions still load
- [ ] Logout clears session and redirects to login
- [ ] Page refresh restores session from localStorage
- [ ] Release Readiness shows all checks passing
- [ ] MVP freeze is still active (can't create new keys)
- [ ] Build passes: `npm run build`

---

## Support

For issues:
1. Check console logs (DevTools → Console)
2. Look for error messages with `[MVP Freeze]` or `[Supabase]`
3. Review Supabase project logs: https://app.supabase.com
4. Check network tab for failed auth requests
5. See Supabase docs: https://supabase.com/docs

---

## References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase JS Client: https://supabase.com/docs/reference/javascript/introduction
- Vite Env Variables: https://vitejs.dev/guide/env-and-mode.html
- React Router: https://reactrouter.com/
