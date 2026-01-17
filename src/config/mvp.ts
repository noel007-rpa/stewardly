/**
 * MVP Freeze Configuration
 * 
 * When STEWARDLY_MVP_FROZEN === true, Stewardly v1.0 behavior is locked:
 * - No new localStorage keys can be created
 * - Canonical keys cannot be removed or renamed
 * - Auth/user/token storage is blocked
 * - Runtime guards prevent accidental drift
 * 
 * To unfreeze for new development:
 * 1. Change STEWARDLY_MVP_FROZEN to false
 * 2. Bump version in package.json
 * 3. Document breaking changes
 * 4. Re-run Release Readiness checks
 */

export const STEWARDLY_MVP_FROZEN = true;

/**
 * Canonical MVP storage keys (locked when frozen)
 */
export const STEWARDLY_MVP_KEYS = [
  "stewardly_distribution_plans",
  "stewardly_active_plan_id",
  "stewardly_income",
  "stewardly_transactions",
  "stewardly_period_locks",
  "stewardly_period_plan_snapshots",
  "stewardly_release_readiness",
  "stewardly_release_checklist",
] as const;

/**
 * Forbidden storage prefixes when frozen
 * Attempting to store these indicates unintended auth/user tracking
 */
export const STEWARDLY_FORBIDDEN_PREFIXES = [
  "stewardly_user",
  "stewardly_auth",
  "stewardly_token",
  "stewardly_session",
  "stewardly_password",
  "stewardly_email",
] as const;
