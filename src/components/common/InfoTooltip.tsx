import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

interface InfoTooltipProps {
  label: string;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * InfoTooltip component with portal rendering and dynamic positioning
 * Shows on hover (desktop) and click (mobile)
 * Closes on ESC, click outside, or icon click
 */
export function InfoTooltip({ label, content, side = "top" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Compute tooltip position based on button location
  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // Max width (w-80)
    const tooltipHeight = 140; // Approximate height
    const offset = 8;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = rect.top - tooltipHeight - offset + window.scrollY;
        left = rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX;
        break;
      case "bottom":
        top = rect.bottom + offset + window.scrollY;
        left = rect.left + rect.width / 2 - tooltipWidth / 2 + window.scrollX;
        break;
      case "left":
        top = rect.top + rect.height / 2 - 50 + window.scrollY;
        left = rect.left - tooltipWidth - offset + window.scrollX;
        break;
      case "right":
        top = rect.top + rect.height / 2 - 50 + window.scrollY;
        left = rect.right + offset + window.scrollX;
        break;
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        title={label}
        aria-label={label}
        role="button"
      >
        ⓘ
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
            <div className="text-sm font-semibold text-slate-900">{label}</div>
            <div className="mt-2 text-sm text-slate-700">{content}</div>
            {/* Small arrow pointing down */}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 transform rotate-45 border-b border-r border-slate-300 bg-white" />
          </div>,
          document.body
        )}
    </div>
  );
}
