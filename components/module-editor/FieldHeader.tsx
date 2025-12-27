"use client";

import { Link2 } from "lucide-react";

interface FieldHeaderProps {
  label: React.ReactNode;
  description?: string;
  required?: boolean;
  showLink?: boolean;
  onLinkClick?: () => void;
  isLinked?: boolean;
  linkLabel?: string;
}

export function FieldHeader({
  label,
  description,
  required,
  showLink,
  onLinkClick,
  isLinked,
  linkLabel = "Link",
}: FieldHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-1.5">
      <div className="flex-1">
        <label className="block text-sm font-medium text-label-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>

        {description && (
          <p className="text-xs text-md-on-surface-variant mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Right side actions */}
      {showLink && !isLinked && (
        <button
          type="button"
          onClick={onLinkClick}
          className="flex items-center gap-1 text-xs text-md-on-surface-variant hover:text-foreground transition-colors p-1 -mr-1 mt-0.5"
          title="Link this field to another module field"
        >
          <Link2 className="h-3.5 w-3.5" />
          <span>{linkLabel}</span>
        </button>
      )}
    </div>
  );
}
