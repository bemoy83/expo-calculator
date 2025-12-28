import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Shared card styling constants
export const CARD_BACKGROUND = 'bg-md-surface-container';
export const CARD_BORDER = 'border border-md-outline';
export const CARD_ROUNDED = 'rounded-extra-large';
export const CARD_BASE_CLASSES = `${CARD_BACKGROUND} ${CARD_BORDER} ${CARD_ROUNDED} transition-all relative`;

const VARIANT_STYLES = {
  default: {
    background: CARD_BACKGROUND,
    border: "",
    elevation: 1,
  },
  flat: {
    background: CARD_BACKGROUND,
    border: "",
    elevation: 0,
  },
  outlined: {
    background: CARD_BACKGROUND,
    border: CARD_BORDER,
    elevation: 0,
  },
  raised: {
    background: CARD_BACKGROUND,
    border: "",
    elevation: 3,
  },
  overlay: {
    background: "bg-md-surface-container-highest",
    border: "",
    elevation: 8,
  },
} as const;

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
  stickyTop?: number; // default → 88
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
      stickyTop = 88,

      ...rest
    },
    ref
  ) => {
    const variantStyles = VARIANT_STYLES[variant];
    const appliedElevation = elevation ?? variantStyles.elevation;

    const paddingClass =
      density === "dense"
        ? "p-4"
        : density === "roomy"
        ? "p-8"
        : "p-6";

    const autoInteractive =
      interactive ?? Boolean(rest.onClick || rest.role === "button");

    const titleId = title
      ? `card-title-${Math.random().toString(36).slice(2)}`
      : undefined;

    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        {...rest}
        className={cn(
          CARD_ROUNDED,
          "transition-all relative",
          paddingClass,
          variantStyles.background,
          variantStyles.border,
          `elevation-${appliedElevation}`,
          autoInteractive && "hover-overlay cursor-pointer",
          sticky && "sticky z-[50]", // valid class
          className
        )}
        style={{
          ...(sticky ? { top: stickyTop } : {}),
          ...(rest.style ?? {}), // ensure dnd-kit transform is preserved
        }}
      >
        {(title || actions) && (
          <div className="flex items-center justify-between mb-5 relative z-10">
            {title && (
              <h3
                id={titleId}
                className="text-lg font-bold text-md-on-surface tracking-tight"
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

