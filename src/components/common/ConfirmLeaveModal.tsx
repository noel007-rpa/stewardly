type ConfirmLeaveModalProps = {
  isOpen: boolean;
  isDirty: boolean;
  onStay: () => void;
  onDiscard: () => void;
  message?: string;
};

export function ConfirmLeaveModal({
  isOpen,
  isDirty,
  onStay,
  onDiscard,
  message = "You have unsaved changes.",
}: ConfirmLeaveModalProps) {
  if (!isOpen || !isDirty) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-4 space-y-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-3">
            <svg
              className="h-6 w-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 110 18 9 9 0 010-18z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-lg font-semibold text-slate-900 text-center">
          Unsaved Changes
        </h3>

        {/* Message */}
        <p className="text-sm text-slate-600 text-center">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onStay}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
          >
            Stay
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 font-semibold text-white transition-colors"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
