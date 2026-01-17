type Props = {
  period: string | null; // YYYY-MM format or null
  locked: boolean;
};

/**
 * Helper: Generate consistent lock banner title
 */
export function getLockedTitle(): string {
  return `Locked month — changes disabled`;
}

/**
 * Reusable lock enforcement banner
 * Shows when a period is locked to communicate read-only state
 */
export function LockBanner({ period, locked }: Props) {
  if (!locked || !period) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">🔒 {getLockedTitle()}</div>
      <div className="mt-1">Period {period} is locked. Changes are disabled.</div>
    </div>
  );
}
