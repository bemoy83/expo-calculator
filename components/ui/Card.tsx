import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

// Design primitives (mockup 1a / 3a): cards are a surface with a hairline border and a
// 10px radius; elevation is border weight plus a faint shadow (none in dark). Only
// raised/overlay cards (panels, popovers) cast the panel shadow.
const VARIANT_STYLES = {
  default: "bg-surface border border-border shadow-card",
  flat: "bg-surface border border-border",
  outlined: "bg-surface border border-border-strong",
  raised: "bg-surface border border-border-strong shadow-panel",
  overlay: "bg-surface border border-border-strong shadow-panel",
} as const;

// The old MD3 elevation levels, mapped onto the two design shadows.
function elevationShadow(elevation: number) {
  if (elevation === 0) return "shadow-none";
  return elevation >= 3 ? "shadow-panel" : "shadow-card";
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;

  /** ▼ NEW: interactive auto-detect (can override) */
  interactive?: boolean;

  /** ▼ Existing */
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 8 | 12 | 16 | 24;
  variant?: "default" | "flat" | "outlined" | "overlay" | "raised";

  /** ▼ NEW: density spacing control */
  density?: "dense" | "default" | "roomy";

  /** ▼ NEW: sticky helper */
  sticky?: boolean;
  stickyTop?: number; // px below the app header, default → 24
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      title,
      actions,

      interactive,
      elevation,
      variant = "default",

      density = "default",

      sticky = false,
      stickyTop = 24,

      ...rest
    },
    ref
  ) => {
    const generatedTitleId = useId();
    const variantStyles = VARIANT_STYLES[variant];

    const paddingClass =
      density === "dense"
        ? "p-4"
        : density === "roomy"
        ? "p-6"
        : "p-5";

    const autoInteractive =
      interactive ?? Boolean(rest.onClick || rest.role === "button");

    const titleId = title ? `card-title-${generatedTitleId}` : undefined;

    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        {...rest}
        className={cn(
          "rounded-[10px] relative transition-colors",
          paddingClass,
          variantStyles,
          elevation !== undefined && elevationShadow(elevation),
          autoInteractive && "hover:bg-surface-hover cursor-pointer",
          sticky && "sticky z-[50]", // valid class
          className
        )}
        style={{
          ...(sticky ? { top: `calc(var(--app-header-h) + ${stickyTop}px)` } : {}),
          ...(rest.style ?? {}), // ensure dnd-kit transform is preserved
        }}
      >
        {(title || actions) && (
          <div className="flex items-center justify-between mb-4 relative z-10">
            {title && (
              <h3
                id={titleId}
                className="text-base font-semibold text-ink tracking-tight"
              >
                {title}
              </h3>
            )}
            {actions && <div>{actions}</div>}
          </div>
        )}

        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";

