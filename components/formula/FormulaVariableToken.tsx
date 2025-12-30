"use client";

import React from "react";
import { Chip } from "../ui/Chip"; // adjust import path if needed
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormulaVariableTokenProps {
  label: string;
  value: string;
  isUsed: boolean;
  onInsert: (value: string) => void;

  size?: "sm" | "md";
  layout?: "inline" | "stretch";
  disabled?: boolean;
  className?: string;
}

export function FormulaVariableToken({
  label,
  value,
  isUsed,
  onInsert,
  size = "sm",
  layout = "inline",
  disabled = false,
  className
}: FormulaVariableTokenProps) {

  // map semantic → visual state
  const variant = isUsed
    ? "success"    // clearly “active / in use”
    : "primary";        // neutral, consistent with rest of app

  const handleInsert = () => {
    if (disabled) return;
    onInsert(value);
  };

  return (
    <Chip
      size={size}
      variant={variant}
      onClick={handleInsert}
      aria-pressed={isUsed}
      aria-disabled={disabled}
      aria-label={
        isUsed
          ? `${label} is already used in formula`
          : `Insert ${label} into formula`
      }
      className={cn(
        "font-mono min-w-0",
        layout === "stretch" && "w-full justify-start text-left",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      leadingIcon={
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isUsed && (
            <CheckCircle2 className="h-3.5 w-3.5 text-md-on-primary-container" />
          )}
        </span>
      }
    >
      {label}
    </Chip>
  );
}
