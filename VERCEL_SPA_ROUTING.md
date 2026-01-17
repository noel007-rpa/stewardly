# Vercel SPA Routing Configuration

## Overview

Stewardly is a React SPA (Single Page Application) using React Router. When deployed to Vercel, all app routes must be rewritten to `index.html` so that client-side routing can handle navigation.

This document explains:
1. **Why rewrites are needed**
2. **What happens without rewrites** (Supabase auth failure)
3. **How the fix works**
4. **Deployment verification**

---

## The Problem: Missing Rewrites

### Without `vercel.json` Rewrites

When a user tries to sign up via Supabase:

```
1. User fills sign-up form on /login
   └─ Clicks "Sign up"
      └─ Form submits to Supabase
         └─ Supabase sends confirmation email with redirect_to parameter
            └─ Email contains: https://stewardly.vercel.app/dashboard/cashflow
```

Without rewrites configured:

```
2. User clicks link in email
   └─ Browser requests: https://stewardly.vercel.app/dashboard/cashflow
      └─ Vercel looks for physical file: dist/dashboard/cashflow (DOESN'T EXIST)
         └─ Returns 404 Not Found
            └─ Browser receives 404 error page
               └─ JavaScript bundle never loads
                  └─ React Router never initializes
                     └─ No route handler for /dashboard/cashflow
                        └─ User sees: "Failed to fetch" or 404 page
                           └─ Supabase auth flow BREAKS ❌
```

### Browser DevTools Shows

```
GET https://stewardly.vercel.app/dashboard/cashflow
Status: 404 Not Found
Content-Type: text/html (error page, not JS bundle)

Error: Failed to fetch (CORS, missing bundle)
```

### Why This Breaks Auth

1. Supabase sends email with `redirect_to=/dashboard/cashflow`
2. User clicks link
3. Vercel returns 404 instead of index.html
4. JavaScript never loads, so React Router can't initialize
5. Auth callback handler in React never runs
6. User is stuck on 404 page
7. Session was created on Supabase side, but app can't receive it
8. User must manually navigate back and sign in again (defeats the purpose)

---

## The Solution: Rewrites in `vercel.json`

### What `vercel.json` Does

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

**In English:**
- Catch ALL requests matching pattern `/(.*)`  (any path)
- Instead of looking for a file, rewrite to `/` (index.html)
- Vercel still serves `index.html` with **200 OK** status
- JavaScript bundle loads successfully
- React Router initializes
- React Router handles the actual route based on URL

### With Rewrites Configured

```
1. User clicks email link: https://stewardly.vercel.app/dashboard/cashflow
   └─ Browser requests /dashboard/cashflow
      └─ Vercel sees rewrite rule: source="/(.*)" → destination="/"
         └─ Serves dist/index.html (with 200 OK!)
            └─ JavaScript bundle loads successfully
               └─ React initializes
                  └─ React Router sees URL is /dashboard/cashflow
                     └─ Renders Dashboard component
                        └─ useAuth hook restores session from localStorage
                           └─ User is logged in! ✅
```

### Browser DevTools Shows

```
GET https://stewardly.vercel.app/dashboard/cashflow
Status: 200 OK (rewritten to /)
Content-Type: application/javascript (JS bundle)

[App loads successfully]
useAuth: Session restored from localStorage
Dashboard renders with user data
```

---

## How React Router + Rewrites Work Together

### Client-Side Routing Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User navigates to: https://stewardly.vercel.app/plans/new   │
└────────────┬────────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────┐
    │ Vercel receives    │
    │ GET /plans/new     │
    └────────┬───────────┘
             │
             ├─ Check rewrites:
             │  source: "/(.*)" matches "/plans/new" ✓
             │  destination: "/" (rewrite to root)
             │
             ↓
    ┌────────────────────────────┐
    │ Serve: dist/index.html     │
    │ Status: 200 OK             │
    │ (CORS headers OK)          │
    └────────┬───────────────────┘
             │
             ↓
    ┌────────────────────────────────┐
    │ Browser loads JS bundle        │
    │ React app initializes          │
    └────────┬───────────────────────┘
             │
             ↓
    ┌────────────────────────────────┐
    │ React Router checks URL:       │
    │ window.location.pathname       │
    │ = "/plans/new"                 │
    └────────┬───────────────────────┘
             │
             ↓
    ┌────────────────────────────────┐
    │ Router matches route:          │
    │ path: "/plans/:id/edit"        │
    │ or path: "/plans/new"          │
    └────────┬───────────────────────┘
             │
             ↓
    ┌────────────────────────────────┐
    │ Renders PlanEditor component   │
    │ with correct data              │
    └────────────────────────────────┘
```

---

## Why Supabase Auth Specifically Fails

### Supabase Auth Email Flow

```
1. User signs up at https://stewardly.vercel.app/login
   ├─ Enters email + password
   └─ Calls: supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/cashflow`
        }
      })
```

### Supabase Behavior

1. **Receives signup request** → Creates user in auth system
2. **Generates confirmation token** → Embeds in email link
3. **Email Link Format:**
   ```
   https://stewardly.vercel.app/auth/callback?token=xxxxx&type=signup&redirect_to=/dashboard/cashflow
   ```
   (Supabase uses `redirect_to` parameter to know where to send user after confirmation)

### What Happens on Email Click (WITHOUT Rewrites)

```
1. User clicks email link
   └─ Browser navigates to: /auth/callback?token=xxxxx&type=signup&redirect_to=/dashboard/cashflow

2. Vercel receives request for /auth/callback
   ├─ No rewrite rule exists (not configured in vercel.json)
   ├─ Looks for file: dist/auth/callback.html
   ├─ File doesn't exist (SPA only has dist/index.html)
   └─ Returns 404 Not Found

3. Browser receives 404 response
   ├─ JavaScript bundle NOT loaded (404 page served instead)
   ├─ React Router NEVER initializes
   ├─ No route handlers available
   └─ User sees blank page or Vercel 404 error

4. Network request fails
   └─ Browser console: "Failed to fetch"
   └─ Or CORS error if 404 page has different origin headers

5. User never makes it to /dashboard/cashflow
   ├─ Supabase created user successfully
   ├─ But redirect failed
   └─ User must manually navigate back to /login
      └─ Can now sign in with email/password they just created
      └─ But email confirmation flow is broken
```

### What Happens on Email Click (WITH Rewrites)

```
1. User clicks email link
   └─ Browser navigates to: /auth/callback?token=xxxxx&type=signup&redirect_to=/dashboard/cashflow

2. Vercel receives request for /auth/callback
   ├─ Rewrite rule matches: source="/(.*)" → destination="/"
   ├─ Rewrite to: /
   └─ Serve dist/index.html (200 OK!)

3. Browser receives 200 with JS bundle
   ├─ JavaScript loads successfully
   ├─ React initializes
   └─ React Router initializes

4. React Router checks URL
   ├─ Sees: /auth/callback?token=xxxxx...
   ├─ Matches route handler (if exists)
   └─ Or falls through to IndexRedirect

5. useAuth hook restores session
   ├─ Supabase session already set (by email confirmation)
   ├─ localStorage has tokens
   └─ User is authenticated ✓

6. Redirect to redirect_to parameter
   └─ /dashboard/cashflow ✓
   └─ User sees dashboard with data ✓
```

---

## Deployment Verification

### Step 1: Deploy to Vercel

```bash
# Build locally
npm run build

# Push to GitHub (if using Git integration)
git push origin main

# Or deploy directly
vercel deploy --prod
```

### Step 2: Verify `vercel.json` Is Deployed

1. Go to Vercel dashboard
2. Project → Settings → Build & Deployment
3. Should see configuration applied

Or check via API:
```bash
curl https://stewardly.vercel.app/vercel.json
# Returns JSON config
```

### Step 3: Test SPA Routes Work

**Test direct navigation:**
```bash
# Direct URL navigation (simulates email clicks)
https://stewardly.vercel.app/dashboard/cashflow
# Expected: 200 OK, Dashboard loads

https://stewardly.vercel.app/plans/new
# Expected: 200 OK, Plan Editor loads

https://stewardly.vercel.app/reports/monthly
# Expected: 200 OK, Monthly Report loads
```

**Test in DevTools:**
```
Network tab
├─ GET /dashboard/cashflow
├─ Status: 200 OK (not 404!)
├─ Content-Type: text/html (index.html)
└─ Size: ~50KB (JS bundle)
```

### Step 4: Test Auth Flow

**Manual test:**
```bash
1. Navigate to https://stewardly.vercel.app
2. Redirects to /login ✓
3. Sign up with new email
4. Check email for confirmation link
5. Click link in email
6. Should land on dashboard/cashflow with JS loaded
7. useAuth hook restores session
8. Dashboard displays data ✓
```

**Expected Success:**
```
GET /auth/callback?token=xxx&redirect_to=/dashboard/cashflow
Status: 200 OK (rewritten to /)
[App loads]
[Session restored]
[Redirects to /dashboard/cashflow]
[Dashboard renders]
```

---

## Configuration Reference

### `vercel.json` Syntax

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

**Breakdown:**
- `source`: URL pattern to match (regex)
  - `/(.*)`  = any path (/)  + anything after (.*) 
  - Matches: `/`, `/login`, `/plans/123`, `/dashboard/cashflow`, etc.
  
- `destination`: Where to serve from
  - `/` = serve index.html (which is the SPA bundle)

**Why not `index.html`?**
- Vercel expects `destination` to be a path, not a file
- `/` automatically serves `index.html`
- Matches Vite build output structure

### Alternatives (NOT Recommended)

❌ **Don't use `cleanUrls`:**
```json
{
  "cleanUrls": true
}
```
This removes `.html` extensions but doesn't handle SPA routing.

❌ **Don't use `trailingSlash`:**
```json
{
  "trailingSlash": true
}
```
This just normalizes slash behavior, doesn't fix SPA routing.

✅ **Use rewrites (recommended):**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```
This is the standard for all SPAs.

---

## Other Deployment Platforms

### GitHub Pages
Use a single-page app workaround:
```html
<!-- public/404.html -->
<!DOCTYPE html>
<script>
  sessionStorage.redirect = location.href;
</script>
<meta http-equiv="refresh" content="0;url=/index.html" />
```

### Netlify
```toml
# netlify.toml
[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

### AWS S3 + CloudFront
Configure S3 error page to serve index.html on 404.

### Self-hosted (nginx)
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Self-hosted (Apache)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} -f [OR]
  RewriteCond %{DOCUMENT_ROOT}%{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ /index.html [L]
</IfModule>
```

---

## Troubleshooting

### Problem: Still Getting 404 on Deployment

**Solution:**
1. Verify `vercel.json` is in project root (same level as `package.json`)
2. Check via: `ls -la vercel.json`
3. Redeploy: `vercel deploy --prod`
4. Wait 30 seconds for CDN cache refresh
5. Test: `curl -I https://stewardly.vercel.app/dashboard/cashflow`
   - Should show `200 OK`, not `404`

### Problem: Auth Email Redirects Still Failing

**Check:**
1. Is app deployed to Vercel? (not localhost)
2. Is `vercel.json` deployed?
3. Check email redirect_to parameter:
   ```typescript
   console.log("Redirect to:", `${window.location.origin}/dashboard/cashflow`);
   ```
   - Should be production URL (https://stewardly.vercel.app/...)
4. Check browser console for JS errors
5. Verify `window.location.pathname` in DevTools Console:
   ```javascript
   console.log(window.location.pathname); // Should be /dashboard/cashflow
   ```

### Problem: Infinite Rewrite Loop

**Won't happen with this config** because:
- `destination: /` only routes to index.html (once)
- React Router handles subsequent navigation
- No circular rewrites

---

## Security & Performance

### Is This Secure?

✅ **Yes.**
- Rewrites are internal Vercel operations (no external redirect)
- URL bar still shows correct URL
- No CORS issues
- Standard practice for all SPAs
- Supabase tokens still validated securely

### Does This Affect Performance?

✅ **No.**
- Rewrite happens at edge (very fast)
- Single HTTP request
- No redirect loop
- Identical bundle size
- Served from Vercel edge cache

### Does This Break Direct File Serving?

✅ **No.**
- Static assets (CSS, JS in dist) still served directly
- API routes (if any) still work
- Only HTML routes rewritten to SPA

---

## File Placement

```
stewardly/
├── src/
├── dist/
├── package.json
├── vite.config.ts
├── vercel.json           ← CREATE THIS FILE
├── README.md
└── RELEASE.md
```

**File must be:**
- ✅ In project root (same level as package.json)
- ✅ Named exactly `vercel.json`
- ✅ Valid JSON (no trailing commas)
- ✅ Committed to git
- ✅ Deployed to Vercel

---

## Summary

| Aspect | Without Rewrites | With Rewrites |
|--------|------------------|---------------|
| Direct route access | 404 Not Found | 200 OK |
| Email redirect works | ❌ Fails | ✅ Works |
| JavaScript loads | ❌ No | ✅ Yes |
| React Router works | ❌ No | ✅ Yes |
| Supabase auth succeeds | ❌ No | ✅ Yes |
| User experience | Broken auth | Seamless |

---

**Last Updated:** January 18, 2026  
**Required for:** Production Vercel deployment  
**Status:** ✅ Configured
