type PlanSnapshotNoticeProps = {
  hasSnapshots: boolean;
  lockedPeriodsUsed?: string[]; // YYYY-MM format
};

function formatMonth(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function PlanSnapshotNotice({
  hasSnapshots,
  lockedPeriodsUsed = [],
}: PlanSnapshotNoticeProps) {
  if (!hasSnapshots) {
    return null;
  }

  const visibleMonths = lockedPeriodsUsed.slice(0, 6);
  const hiddenCount = Math.max(0, lockedPeriodsUsed.length - 6);

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3">
      <div className="space-y-3">
        {/* Header with icon and message */}
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-600 shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-blue-900 font-medium">
            This plan is used in locked periods. Changes won't affect those months.
          </p>
        </div>

        {/* Months chips */}
        {lockedPeriodsUsed.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-8">
            {visibleMonths.map((month) => (
              <span
                key={month}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800"
              >
                {formatMonth(month)}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                +{hiddenCount} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
