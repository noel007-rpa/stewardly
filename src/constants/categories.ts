export const CATEGORIES = [
  "Living",
  "Savings",
  "Investments",
  "Debt",
  "Protection",
  "SupportGiving",
  "Taxes",
  "Education",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];
