import type { CategoryName } from "../constants/categories";

/**
 * Frequency for scheduled transactions
 */
export type ScheduledFrequency = "monthly" | "yearly";

/**
 * Rule for determining the execution day
 */
export type ScheduledRule = "dayOfMonth" | "endOfMonth";

/**
 * Direction of scheduled transaction (expense or income)
 */
export type ScheduledDirection = "out" | "in";

/**
 * Matching mode for categorizing transactions
 */
export type ScheduledMatchMode = "amountOnly" | "keyword" | "both";

/**
 * Template for a scheduled transaction
 * Defines recurring transactions with flexible scheduling rules
 */
export interface ScheduledTransactionTemplate {
  /** Unique identifier */
  id: string;

  /** Display name for the scheduled transaction */
  name: string;

  /** Category for the transaction */
  category: CategoryName;

  /** Transaction amount */
  amount: number;

  /** Currency code (defaults to plan currency) */
  currency?: string;

  /** Whether this is an expense (out) or income (in) */
  direction: ScheduledDirection;

  /** How often the transaction occurs */
  frequency: ScheduledFrequency;

  /** Rule for determining execution day */
  rule: ScheduledRule;

  /** Day of month (1-31) when using dayOfMonth rule */
  day?: number;

  /** Whether this scheduled transaction is active */
  active: boolean;

  /** Optional note for the transaction */
  note?: string;

  /** How to match this transaction when auto-categorizing */
  matchMode?: ScheduledMatchMode;

  /** Keyword to match for auto-categorization */
  matchKeyword?: string;
}
