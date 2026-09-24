"use client";

import { Link2, Unlink } from "lucide-react";

interface FieldHeaderProps {
  label: React.ReactNode;
  description?: string;
  required?: boolean;

  unit?: string;
  unitSymbol?: string;

  showLink?: boolean;
  onLinkClick?: () => void;
  isLinked?: boolean;
  linkLabel?: string;
  onUnlinkClick?: () => void;
}

export function FieldHeader({
  label,
  description,
  required,

  unit,
  unitSymbol,

  showLink,
  onLinkClick,
  isLinked,
  linkLabel = "Link",
  onUnlinkClick,
}: FieldHeaderProps) {
  const formattedUnit = (() => {
    if (!unit && !unitSymbol) return null;
    if (unit && unitSymbol && unit !== unitSymbol) {
      return `${unit} (${unitSymbol})`;
    }
    return unit || unitSymbol;
  })();

  return (
    <div className="flex items-center justify-between h-5 mb-1">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-ink-muted leading-tight truncate">
          {label}

          {/* Inline unit helper */}
          {formattedUnit && (
            <span className="ml-1.5 text-[11px] font-numeric text-ink-faint">
              {formattedUnit}
            </span>
          )}

          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      </div>

      {/* Right side link/unlink button - always reserve space for consistent alignment */}
      <div className="flex-shrink-0 ml-2 min-w-[60px] flex justify-end">
        {showLink && !isLinked && (
          <button
            type="button"
            onClick={onLinkClick}
            className="flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-action transition-colors p-1 -mr-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            title="Link this field to another module field"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>{linkLabel}</span>
          </button>
        )}
        {showLink && isLinked && onUnlinkClick && (
          <button
            type="button"
            onClick={onUnlinkClick}
            className="flex items-center gap-1 text-[11px] font-medium text-danger hover:text-danger/80 transition-colors p-1 -mr-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            title="Unlink this field"
          >
            <Unlink className="h-3.5 w-3.5" />
            <span>Unlink</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Export description separately so it can be rendered below the input
export function FieldDescription({ description }: { description?: string }) {
  if (!description) return null;
  return (
    <p className="mt-1 text-[11px] leading-snug text-ink-faint">
      {description}
    </p>
  );
}
