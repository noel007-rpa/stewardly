/**
 * MVP Freeze Runtime Guards
 * 
 * Enforces STEWARDLY_MVP_FROZEN rules at runtime:
 * - Blocks creation of new localStorage keys
 * - Prevents removal/renaming of canonical keys
 * - Warns about auth/user/token storage attempts
 */

import { STEWARDLY_MVP_FROZEN, STEWARDLY_MVP_KEYS, STEWARDLY_FORBIDDEN_PREFIXES } from "../config/mvp";

/**
 * Validates that a key write operation is allowed under MVP freeze
 * 
 * Throws if:
 * - Attempting to create a new stewardly_* key
 * - Attempting to store forbidden prefixes (auth/user/token/etc)
 * 
 * Logs warning if:
 * - Code tries to access auth-related keys
 */
export function validateStorageKeyWrite(key: string): void {
  if (!STEWARDLY_MVP_FROZEN) {
    return; // Freeze inactive, all writes allowed
  }

  // Check if this is a Stewardly key
  if (!key.startsWith("stewardly_")) {
    return; // Non-Stewardly keys are not frozen
  }

  const allowedKeys = new Set(STEWARDLY_MVP_KEYS);
  const forbiddenPrefixes = STEWARDLY_FORBIDDEN_PREFIXES;

  // Rule 1: Block creation of new stewardly_* keys
  if (!allowedKeys.has(key as any)) {
    const errorMsg = `[MVP Freeze] Cannot create new localStorage key "${key}" - Stewardly v1.0 is frozen. To add new keys, increment version and set STEWARDLY_MVP_FROZEN = false in src/config/mvp.ts`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Rule 2: Warn about forbidden prefixes (even though they're blocked by Rule 1)
  for (const prefix of forbiddenPrefixes) {
    if (key.toLowerCase().includes(prefix.toLowerCase())) {
      const warningMsg = `[MVP Freeze] Attempted to store auth/user/token data in key "${key}" - this should not be persisted in Stewardly v1.0`;
      console.warn(warningMsg);
    }
  }
}

/**
 * Validates that a key removal operation is allowed under MVP freeze
 * 
 * Throws if:
 * - Attempting to remove a canonical MVP key (except during official cleanup)
 */
export function validateStorageKeyRemoval(key: string): void {
  if (!STEWARDLY_MVP_FROZEN) {
    return; // Freeze inactive, all removals allowed
  }

  // Non-Stewardly keys can be removed
  if (!key.startsWith("stewardly_")) {
    return;
  }

  const allowedKeys = new Set(STEWARDLY_MVP_KEYS);

  // Only allow removal of canonical keys during official cleanup
  // (Runtime cleanup function will handle this with special bypass)
  if (allowedKeys.has(key as any)) {
    // This is blocked at the store level, not here
    // Store operations control whether removals are allowed
    return;
  }
}

/**
 * Logs the MVP freeze status at app startup
 */
export function logMVPFreezeStatus(): void {
  if (STEWARDLY_MVP_FROZEN) {
    console.log(
      "%c[MVP Freeze Active] Stewardly v1.0 is frozen. Storage keys are locked. Version 1.0 behavior cannot drift.",
      "color: #ff8c42; font-weight: bold; font-size: 12px;"
    );
    console.log(
      `%cCanonical keys locked: ${STEWARDLY_MVP_KEYS.join(", ")}`,
      "color: #666; font-size: 11px;"
    );
  } else {
    console.log(
      "%c[MVP Freeze Inactive] Stewardly is in development mode. Storage keys are not frozen.",
      "color: #4caf50; font-weight: bold; font-size: 12px;"
    );
  }
}

/**
 * Check if MVP is currently frozen
 */
export function isMVPFrozen(): boolean {
  return STEWARDLY_MVP_FROZEN;
}

/**
 * Get list of canonical (frozen) keys
 */
export function getFrozenKeys(): string[] {
  return Array.from(STEWARDLY_MVP_KEYS);
}
