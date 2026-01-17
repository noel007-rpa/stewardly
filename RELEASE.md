# Release: Stewardly v1.0.0

**Release Date:** January 17, 2026

**Status:** Production Ready - MVP Freeze Enabled

---

## Overview

Stewardly v1.0.0 is the initial production release featuring distribution-first budgeting with comprehensive planning, income, transaction, and reporting capabilities.

See [CHANGELOG.md](./CHANGELOG.md) for complete feature list.

---

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Run Development Server

```bash
npm install
npm run dev
```

Server starts at `http://localhost:5173` with hot module reloading.

Development features:
- Release Readiness page at `/settings/release-readiness`
- DEV-only utilities like "Purge Legacy Keys" button
- Console logging for MVP Freeze state
- Full TypeScript strict mode checking

---

## Production Build

### Build for Production

```bash
npm run build
```

This command:
1. Type-checks with TypeScript (`tsc -b`)
2. Bundles with Vite (`vite build`)
3. Outputs to `dist/` directory
4. Produces optimized, minified assets

**Build must pass with 0 errors before release.**

### Preview Production Build

```bash
npm preview
```

Serves the production build locally to verify before deployment.

---

## Deployment

### Current Deployment Method

Stewardly v1.0.0 uses **static site hosting**:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` directory** to:
   - GitHub Pages
   - Netlify
   - Vercel
   - Any static hosting service
   - Self-hosted web server (nginx, Apache)

### Vercel Deployment (Recommended for Supabase Auth)

When deploying to Vercel:

1. **`vercel.json` is included** in the project root
   - Configures SPA routing for all paths
   - Required for Supabase auth email redirects to work
   - Without it: email callback links return 404 errors

2. **Deploy steps:**
   ```bash
   # Push to GitHub (if using Git integration)
   git push origin main
   
   # Or deploy directly
   vercel deploy --prod
   ```

3. **Verify deployment:**
   - Check that direct URL navigation works: `https://stewardly.vercel.app/dashboard/cashflow`
   - Should return 200 OK, not 404
   - Test Supabase signup email redirect

**Important:** See [`VERCEL_SPA_ROUTING.md`](./VERCEL_SPA_ROUTING.md) for complete SPA routing explanation and why Supabase auth fails without `vercel.json`.

### Other Hosting Services

For static hosts other than Vercel:

1. **GitHub Pages**
   - Use 404.html workaround (see VERCEL_SPA_ROUTING.md)
   
2. **Netlify**
   - Create `netlify.toml`:
   ```toml
   [[redirects]]
   from = "/*"
   to = "/index.html"
   status = 200
   ```

3. **Self-hosted (nginx)**
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

4. **Deploy the `dist/` directory** to:
   - GitHub Pages

3. **Configure for single-page app routing:**
   - Ensure 404s redirect to `index.html`
   - Set cache headers appropriately
   - Example for nginx:
     ```nginx
     location / {
       try_files $uri $uri/ /index.html;
     }
     ```

4. **Verify deployment:**
   - Check all routes work (distributions, dashboard, reports, etc.)
   - Verify localStorage persists across page refreshes
   - Test release readiness checks pass

### Environment Variables

Currently, no environment variables required. All configuration is client-side.

For future versions, create `.env` file:
```env
VITE_API_URL=https://api.example.com
VITE_LOG_LEVEL=debug
```

---

## MVP Freeze Guard

Stewardly v1.0.0 has **MVP Freeze enabled**. This prevents accidental modifications to core functionality.

### Freeze Details

- **File:** `src/config/mvp.ts`
- **Master switch:** `STEWARDLY_MVP_FROZEN = true`
- **Protected keys:** 8 canonical storage keys (plans, income, transactions, etc.)
- **Forbidden patterns:** Auth, user, token, session, password, email keys

### What's Locked

✅ **Locked behaviors:**
- Cannot create new `stewardly_*` localStorage keys
- Attempting to creates error: `[MVP Freeze] Cannot create new localStorage key...`
- Warnings logged for auth/token storage attempts
- Release Readiness shows "MVP Frozen" badge

✅ **Still works normally:**
- All existing features function unchanged
- Reading/modifying existing keys works
- User interactions unaffected
- Reports, plans, transactions all normal

### For v1.1 Development: Unfreeze Instructions

To develop v1.1, unfreeze the app:

1. **Edit `src/config/mvp.ts`:**
   ```typescript
   export const STEWARDLY_MVP_FROZEN = false;  // Changed from true
   ```

2. **Verify in console:**
   - Open DevTools
   - Watch for `[MVP Freeze] Status: UNFROZEN` at startup
   - Or call `isMVPFrozen()` in console (should return `false`)

3. **You can now:**
   - Create new `stewardly_*` storage keys
   - Add new features without freeze restrictions
   - Test new storage mechanisms

4. **Before releasing v1.1:**
   - Increment version in `package.json` to `1.1.0`
   - Update `CHANGELOG.md`
   - Optional: Re-freeze with new canonical keys if desired

5. **For debugging:**
   - Call `logMVPFreezeStatus()` from console to see detailed status
   - Call `getFrozenKeys()` to list canonical keys
   - Check `src/utils/mvpFreezeGuard.ts` for guard implementations

---

## Release Checklist

Before tagging a release:

- [ ] Version updated in `package.json`
- [ ] `CHANGELOG.md` updated with new features/fixes
- [ ] `npm run build` passes with 0 errors
- [ ] `npm run lint` passes (no warnings)
- [ ] Release Readiness page shows all checks passing
- [ ] Manual testing on key flows completed
- [ ] No breaking changes documented
- [ ] Git status clean (all changes committed)

## Git Release Commands

**Check status:**
```bash
git status
```

**Stage all changes:**
```bash
git add .
```

**Commit release:**
```bash
git commit -m "Release v1.0.0"
```

**Create release tag:**
```bash
git tag v1.0.0
```

**Push to remote:**
```bash
git push
```

**Push tags to remote:**
```bash
git push --tags
```

**Verify tag:**
```bash
git tag -l v1.0.0
```

---

## Troubleshooting

### Build Fails with TypeScript Errors

1. Check `npm run lint` output
2. Verify `tsconfig.json` settings
3. Ensure all files compile: `tsc --noEmit`
4. Check console for specific TS error codes

### Release Readiness Checks Fail

Navigate to `/settings/release-readiness` to see failing checks:
- Common issues: Storage keys invalid, secrets detected, environment settings
- Use "Quick Checks" to diagnose
- Use "Purge Legacy Keys" (when not frozen) to clean legacy storage

### MVP Freeze Errors in Console

If you see `[MVP Freeze] Cannot create new localStorage key...` during development:
- This is expected if `STEWARDLY_MVP_FROZEN = true`
- To debug, unfreeze temporarily (see "Unfreeze Instructions" above)
- Check `src/utils/mvpFreezeGuard.ts` for guard logic

---

## Support & Questions

For issues or questions:
1. Check Release Readiness page for diagnostics
2. Review console logs and errors
3. See GitHub repository: https://github.com/noel007-rpa/stewardly

---

**Next Release:** v1.1.0 (planned for future development)
