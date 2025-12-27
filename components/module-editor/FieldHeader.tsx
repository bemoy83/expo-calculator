"use client";

import { Link2 } from "lucide-react";

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
}: FieldHeaderProps) {
  const formattedUnit = (() => {
    if (!unit && !unitSymbol) return null;
    if (unit && unitSymbol && unit !== unitSymbol) {
      return `${unit} (${unitSymbol})`;
    }
    return unit || unitSymbol;
  })();

  return (
    <div className="flex items-center justify-between h-6 mb-2">
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-label-foreground leading-tight truncate">
          {label}

          {/* Inline unit helper */}
          {formattedUnit && (
            <span className="ml-2 text-xs text-md-on-surface-variant italic">
              {formattedUnit}
            </span>
          )}

          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>

      {/* Right side link button - always reserve space for consistent alignment */}
      <div className="flex-shrink-0 ml-2 min-w-[50px] flex justify-end">
        {showLink && !isLinked && (
          <button
            type="button"
            onClick={onLinkClick}
            className="flex items-center gap-1 text-xs text-md-on-surface-variant hover:text-foreground transition-colors p-1 -mr-1"
            title="Link this field to another module field"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>{linkLabel}</span>
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
    <p className="mt-1.5 text-xs text-md-on-surface-variant">
      {description}
    </p>
  );
}
