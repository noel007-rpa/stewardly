# Release Readiness Checklist

## Overview

The **Release Readiness** page (`/settings/release`) is an MVP QA harness designed to validate Stewardly's core invariants before shipping. It combines:

1. **Manual Checklist** - 17 items across 6 sections for team sign-off
2. **Quick Validation Checks** - 5 automated client-side tests (read-only, no data mutation)
3. **localStorage Persistence** - All checklist states and notes saved locally

## Access

- **Route:** `/settings/release`
- **Navigation:** Left sidebar → Admin section → "Release Readiness"
- **Requirements:** Must be authenticated (protected route)

## Checklist Sections

### 1. Data Integrity (2 items)

| Item | Description |
|------|-------------|
| **No Data Corruption** | localStorage data is valid JSON and properly formatted |
| **Backward Compatibility** | Old data formats are correctly normalized on load |

**What to test:** Create/edit/delete various resources and verify they persist correctly. Check browser DevTools `Application` → `localStorage` for expected keys.

---

### 2. Locking & Snapshots (3 items)

| Item | Description |
|------|-------------|
| **Lock Enforcement** | Locked periods block mutations (income/transaction adds/edits/deletes) |
| **Lock UI Consistency** | UI buttons disabled when period locked; error messages on violations |
| **Snapshot Immutability** | Plans with `hasSnapshots=true` cannot be deleted (guard enforced) |

**What to test:**
- Lock a month via Period Allocation page
- Try to add income/transactions to locked month → should see error banner
- Try to delete a plan with snapshots → button should be disabled or show error
- Verify error messages are clear and helpful

---

### 3. Plans (3 items)

| Item | Description |
|------|-------------|
| **Single Active Plan** | Exactly one active plan if any exist |
| **Plan Targets Sum to 100%** | Active plan targets sum to 100% (within 0.01 tolerance) |
| **Distribution Plan Editor** | Plan creation/edit/delete works; unsaved changes warnings work |

**What to test:**
- Create/edit/duplicate plans
- Verify unsaved changes modal appears on navigation
- Check that only one plan is marked active
- Manually verify target percentages sum to ~100%

---

### 4. Income & Recurrence (3 items)

| Item | Description |
|------|-------------|
| **Income Storage** | Income records correctly stored and retrieved |
| **Income Recurrence** | Recurring monthly income generates virtual instances for unlocked periods only |
| **Virtual Income Read-Only** | Virtual recurring income cannot be edited/deleted from list |

**What to test:**
- Create a recurring monthly income with fixed day (e.g., 15th)
- View a month where it should recur → should see "Recurring" badge
- Try to edit/delete virtual entry → should see error message
- Lock a month → virtual income should disappear
- Unlock the month → virtual income should reappear

---

### 5. Transactions (2 items)

| Item | Description |
|------|-------------|
| **Transaction Storage** | Transactions correctly stored and retrieved |
| **Transaction Direction** | Transaction direction (in/out) tracked and displayed |

**What to test:**
- Add income (in) and expense (out) transactions
- Verify they appear in correct columns on Transactions page
- Delete and re-add to verify storage is correct

---

### 6. Reports & Exports (2 items)

| Item | Description |
|------|-------------|
| **Reports: Current Month** | Report generation works for current period without errors |
| **Reports: Locked Month** | Reports for locked periods use only stored data (no virtual income) |

**What to test:**
- Navigate to Monthly Report → should generate without errors
- Lock a month, view its report → verify it includes only stored income
- Unlock the month, view report again → should include virtual recurrence

---

### 7. Storage / Migration Safety (2 items)

| Item | Description |
|------|-------------|
| **Storage Keys Stable** | localStorage keys documented and won't change |
| **No Secrets in Storage** | localStorage contains only non-sensitive app state |

**What to test:**
- Check DevTools `Application` → `localStorage` for keys
- Verify no credentials, passwords, tokens, or PII stored
- Document all keys in code comments

---

## Quick Validation Checks

Click **"Run Quick Checks"** to execute 5 read-only automated tests:

### Check 1: Single Active Plan
**Purpose:** Verify exactly one plan is marked active (if any plans exist)

**Pass Criteria:**
- 0 plans total, OR
- 1 active plan

**Result Example:** ✓ 1 active plan of 5 total

---

### Check 2: Plan Targets Sum to 100%
**Purpose:** Verify active plan's distribution targets total 100%

**Pass Criteria:**
- Active plan targets sum to 100% (within ±0.01%)

**Result Example:** ✓ Active plan targets sum to 100.00%

---

### Check 3: Snapshot Immutability Guard
**Purpose:** Verify the design prevents deletion of plans with snapshots

**Pass Criteria:**
- Plans with `hasSnapshots=true` exist and are marked immutable

**Result Example:** ✓ 2 plan(s) with snapshots (immutable by design)

---

### Check 4: Lock Enforcement (Mutations)
**Purpose:** Verify locked periods reject income/transaction mutations

**Pass Criteria:**
- Previous month is locked, AND
- Attempting to add income returns a lock error

**Result Example:** ✓ Lock enforced on 2025-12 (correctly blocked)

---

### Check 5: Report Generation
**Purpose:** Verify report selector doesn't crash and includes virtual income

**Pass Criteria:**
- Effective income computed without errors
- Returns array of income items

**Result Example:** ✓ Report generation works (5 income items)

---

## Checklist Status Tracking

Each item has three states:

| Status | Color | Meaning |
|--------|-------|---------|
| **✓ Pass** | Green | Feature verified as working correctly |
| **✗ Fail** | Red | Feature broken or needs fixing |
| **? Not Tested** | Amber | Not yet evaluated |

### Adding Notes

Every checklist item has an optional **Notes** textarea:
- Document test results, edge cases, or follow-up items
- Notes are automatically saved to localStorage with timestamp
- Useful for sharing findings with the team

---

## localStorage Persistence

### Key
```
stewardly_release_checklist
```

### Structure
```javascript
{
  "data_no_corruption": {
    "status": "pass",           // or "fail" / "not_tested"
    "notes": "Verified JSON...",
    "timestamp": "2025-01-17T14:30:00.000Z"
  },
  "lock_enforcement": {
    "status": "fail",
    "notes": "UI not showing lock error...",
    "timestamp": "2025-01-17T15:45:00.000Z"
  }
  // ... more items
}
```

---

## Summary Dashboard

The page displays live counts:

- **Passing:** ✓ (green) - All items with "Pass" status
- **Failing:** ✗ (red) - All items with "Fail" status
- **Not Tested:** ? (amber) - All items with "Not Tested" status

### "Ready to Ship?" Footer

Displays contextual message:
- ✓ All checks passing → Ready to release
- ✗ Fixes needed → Fix failing items before release
- ⚠ Testing incomplete → Complete testing before release

---

## Quick Start: Manual Testing Flow

1. **Open Release Readiness** → `/settings/release`
2. **Plan Tests** (5 min)
   - Create 2 plans with different targets
   - Verify one is active, other inactive
   - Activate the inactive plan
   - Mark **Plans** section items as "Pass"

3. **Income Tests** (5 min)
   - Create recurring monthly income
   - View multiple months, verify recurrence works
   - Try to edit/delete virtual entries
   - Mark **Income & Recurrence** items as "Pass"

4. **Lock Tests** (5 min)
   - Lock previous month via Period Allocation
   - Try to add income to locked month → expect error
   - Mark **Locking & Snapshots** items as "Pass"

5. **Report Tests** (2 min)
   - View Monthly Report
   - Verify it renders without crashing
   - Mark **Reports & Exports** items as "Pass"

6. **Quick Checks** (1 min)
   - Click "Run Quick Checks"
   - Verify all 5 tests pass (green)

7. **Final Review**
   - Add overall notes in any item
   - Check "Ready to Ship?" footer
   - If everything green → safe to release!

---

## Architecture Notes

### Read-Only by Design
- All automated checks use existing store functions
- No test data is persisted
- No mutations of production data
- Checks are idempotent (safe to run repeatedly)

### Lock-Aware Tests
- Checks respect period locks
- Locked periods are simulated but not actually mutated
- Virtual income tested against real lock state

### Extensibility
- New checklist items: Add to `CHECKLIST_ITEMS` array
- New automated checks: Add to `runQuickChecks()` function
- Both are documented with clear purpose and pass criteria

---

## Files

| File | Purpose |
|------|---------|
| `src/pages/settings/ReleaseReadiness.tsx` | Main page component (520 lines) |
| `src/app/routes.tsx` | Route definition: `/settings/release` |
| `src/components/layout/SideNav.tsx` | Navigation link in Admin section |

---

## FAQ

**Q: Can I share the checklist with my team?**
A: Export checklist from localStorage as JSON. Each team member can import and update independently.

**Q: What if Quick Checks fail?**
A: Click on the failing check result for details. Fix the underlying issue, then re-run checks to verify.

**Q: Should I run Quick Checks before every deployment?**
A: Yes! It's a fast sanity check. If any test fails, investigate before shipping.

**Q: Can I delete the checklist?**
A: Clear it manually via browser DevTools → `localStorage.removeItem('stewardly_release_checklist')`

**Q: Is this page visible to end users?**
A: No—it's in the Admin section and only accessible after authentication. Consider hiding it in production or behind a feature flag.

---

## Production Considerations

1. **Feature Flag:** Consider wrapping the Release Readiness route behind a feature flag so it's not shipped in production.
2. **Data Sensitivity:** No sensitive user data is displayed, only app state summaries.
3. **Performance:** All checks are client-side and fast (<100ms typical).
4. **Accessibility:** Page uses semantic HTML and Tailwind classes for contrast.
5. **Mobile:** Page is responsive but designed for desktop QA workflows.

---

## Future Enhancements

- Export checklist as PDF report
- Import pre-signed checklist for team review
- Batch Quick Checks on page load
- Integration with CI/CD to auto-run subset of checks
- Historical tracking of release readiness over time
- Keyboard shortcuts for status toggling
- Dark mode support

---

## Questions?

Refer to:
- **Recurrence Logic:** `src/utils/incomeRecurrence.ts`
- **Lock Enforcement:** `src/state/periodLockGuard.ts`
- **Distribution Store:** `src/state/distributionPlansStore.ts`
- **Income/Transaction Stores:** `src/state/incomeStore.ts`, `src/state/transactionsStore.ts`
