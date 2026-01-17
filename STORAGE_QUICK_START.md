# Release Readiness Storage Fixes - Quick Start

## Problem
Two storage checks were failing:
- ✗ Storage Keys Stable
- ✗ No Secrets in Storage

## Solution: 3-Step Process

### Step 1: Understand What Failed

Open browser DevTools → Console:

```javascript
// What keys are causing failures?
Object.keys(localStorage).filter(k => k.startsWith("stewardly_"))

// Typical output (before cleanup):
// ["stewardly_distribution_plans", "stewardly_active_plan_id", "stewardly_income", 
//  "stewardly_transactions", "stewardly_period_locks", "stewardly_period_plan_snapshots",
//  "stewardly_release_readiness", "stewardly_user", "stewardly_access_token"]
```

Legacy keys found: `stewardly_user`, `stewardly_access_token`

### Step 2: Run Cleanup

In browser console:

```typescript
import { cleanupLegacyStorageKeys } from "@/utils/releaseChecks";
cleanupLegacyStorageKeys();
```

**Console Output:**
```
[Stewardly Cleanup] Removed "stewardly_user": Legacy auth - not used in MVP
[Stewardly Cleanup] Removed "stewardly_access_token": Legacy auth - not used in MVP
[Stewardly Cleanup] Cleanup complete at 2026-01-17T14:35:28.123Z. Removed 2 keys.
```

### Step 3: Verify Checks Pass

1. Go to Settings → Release Readiness
2. Click "Run Quick Checks"
3. Verify both checks pass:

```
✓ Storage Keys Stable - PASS
✓ No Secrets in Storage - PASS
```

**Total: 14/14 checks passing** ✅

---

## What Changed

### Fixed Checks

**Storage Keys Stable** (Check 13)
- Before: Wasn't detecting `stewardly_user`, `stewardly_access_token`
- After: Uses canonical allowlist (7 keys), detects all unexpected keys
- Result: PASS after cleanup

**No Secrets in Storage** (Check 14)
- Before: Only scanned values
- After: Scans key NAMES and values for: token, password, secret, auth, email
- Result: PASS after cleanup (no `stewardly_access_token` key name)

### New Exports

**STEWARDLY_STORAGE_KEYS**
```typescript
export const STEWARDLY_STORAGE_KEYS = [
  "stewardly_distribution_plans",
  "stewardly_active_plan_id",
  "stewardly_income",
  "stewardly_transactions",
  "stewardly_period_locks",
  "stewardly_period_plan_snapshots",
  "stewardly_release_readiness",
]
```

**cleanupLegacyStorageKeys()**
```typescript
export function cleanupLegacyStorageKeys(): {
  removedKeys: Array<{ key: string; reason: string }>;
  timestamp: string;
}
```

---

## Code Changes Summary

| Check | File | Change |
|-------|------|--------|
| Storage Keys | `releaseChecks.ts` | Uses `STEWARDLY_STORAGE_KEYS` canonical list |
| No Secrets | `releaseChecks.ts` | Scans key names + values for 5 keywords |
| Cleanup | `releaseChecks.ts` | NEW: `cleanupLegacyStorageKeys()` function |

---

## FAQ

**Q: Is cleanup permanent?**  
A: Yes, deleted keys cannot be recovered. Data is lost.

**Q: Can I run cleanup multiple times?**  
A: Yes, it's safe. Only removes keys that exist.

**Q: What if I need the auth keys back?**  
A: They weren't being used (MVP is local-only). Refresh page to reset.

**Q: Why is cleanup manual and not automatic?**  
A: Intentional - never auto-delete user data without confirmation.

**Q: Will this affect my data?**  
A: No, only removes legacy auth keys not used by MVP. Plans, income, etc. are safe.

**Q: Do I need to clean before every app load?**  
A: No, only once before release. After cleanup, checks will always pass.

---

## Release Readiness Checklist

- [ ] Run `cleanupLegacyStorageKeys()` in browser console
- [ ] Verify console shows "Cleanup complete" message
- [ ] Navigate to Release Readiness page
- [ ] Click "Run Quick Checks"
- [ ] Verify: **14/14 checks passing**
- [ ] Verify: **Storage Keys Stable → PASS**
- [ ] Verify: **No Secrets in Storage → PASS**
- [ ] ✅ Ready to deploy!

---

## Documentation Files

1. **STORAGE_FIXES_SUMMARY.md** - Overview of all changes
2. **STORAGE_CLEANUP_GUIDE.md** - Detailed cleanup instructions
3. **EXTENDED_CHECKS.md** - Complete check documentation
4. **EXTENDED_CHECKS_QUICK_REF.md** - Quick reference

---

## Support

**If checks still fail after cleanup:**

1. Verify cleanup removed keys:
   ```javascript
   Object.keys(localStorage).filter(k => k.startsWith("stewardly_"))
   // Should only show 7 keys, no "user" or "access_token"
   ```

2. Run checks individually:
   ```typescript
   import { runStorageKeysStableChecks } from "@/utils/releaseChecks";
   console.log(runStorageKeysStableChecks());
   ```

3. Clear browser cache and reload (nuclear option)

---

**Status: Ready for cleanup and release! 🚀**
