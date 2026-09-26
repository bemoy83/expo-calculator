"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Where a variable comes from; sets its colour (same meaning as in the catalog and quotes). */
export type VariableOrigin = "field" | "material" | "labor";

export interface FormulaVariableTokenProps {
  label: string;
  value: string;
  isUsed: boolean;
  onInsert: (value: string) => void;
  /** Blue = the formula's own names (parameters), green = material, amber = labor. */
  origin?: VariableOrigin;

  size?: "sm" | "md";
  layout?: "inline" | "stretch";
  disabled?: boolean;
  className?: string;
}

const ORIGIN_STYLES: Record<VariableOrigin, { base: string; used: string }> = {
  field: { base: "bg-action-bg text-action", used: "border-action" },
  material: { base: "bg-committed-bg text-committed", used: "border-committed" },
  labor: { base: "bg-draft-bg text-draft", used: "border-draft" },
};

// A variable in the formula palette: click to insert. Tinted by origin; a variable already
// in the formula gets a check mark and an outline in the same hue.
export function FormulaVariableToken({
  label,
  value,
  isUsed,
  onInsert,
  origin = "field",
  size = "sm",
  layout = "inline",
  disabled = false,
  className,
}: FormulaVariableTokenProps) {
  const styles = ORIGIN_STYLES[origin];

  return (
    <button
      type="button"
      onClick={() => !disabled && onInsert(value)}
      disabled={disabled}
      aria-label={isUsed ? `${label} is already used in formula; insert again` : `Insert ${label} into formula`}
      className={cn(
        "inline-flex items-center gap-1 min-w-0 rounded-full border font-numeric font-medium transition-opacity",
        "hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-action",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
        styles.base,
        isUsed ? styles.used : "border-transparent",
        layout === "stretch" && "w-full justify-start text-left",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0" aria-hidden="true">
        {isUsed && <CheckCircle2 className="h-3.5 w-3.5" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
