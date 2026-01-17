import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

interface TooltipProps {
  icon?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * Tooltip component with hover/focus support
 * Uses React portal for positioning to avoid parent clipping
 * Positioned above or below the icon with fixed positioning
 * Accessible with keyboard navigation (tab to focus, Escape to close)
 */
export function Tooltip({ icon = "ⓘ", title, children, className = "" }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Compute tooltip position based on button location
  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipHeight = 160; // Approximate height, adjust as needed
    const offset = 8;

    // Try positioning above first
    const topPosition = rect.top - tooltipHeight - offset;
    const shouldPositionAbove = topPosition > 0;

    const top = shouldPositionAbove
      ? rect.top - tooltipHeight - offset + window.scrollY
      : rect.bottom + offset + window.scrollY;

    const left = rect.left + rect.width / 2 - 160 + window.scrollX; // 160 is half of w-80 (320px)

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Update position on scroll/resize
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        title="More information"
        aria-label="More information"
        role="button"
      >
        {icon}
      </button>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            className="pointer-events-none w-80 rounded-lg border border-slate-300 bg-white p-3 shadow-lg"
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
            role="tooltip"
          >
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-2 text-sm text-slate-700">{children}</div>
            {/* Small arrow pointing down */}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 transform rotate-45 border-b border-r border-slate-300 bg-white" />
          </div>,
          document.body
        )}
    </div>
  );
}
