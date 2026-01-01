'use client';

/**
 * PageHeader Component
 *
 * A standardized page header with title, subtitle, and optional action buttons.
 * Used across all main pages for consistent layout and styling.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Calculation Modules"
 *   subtitle="Create reusable calculation modules with custom fields and formulas"
 *   actions={
 *     <Button onClick={handleCreate}>
 *       <Plus className="h-4 w-4 mr-2" />
 *       Create Module
 *     </Button>
 *   }
 * />
 * ```
 */

export interface PageHeaderProps {
  /** The main page title */
  title: string;
  /** Descriptive subtitle explaining the page purpose */
  subtitle: string;
  /** Optional action buttons (typically primary CTA buttons) */
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-lg text-md-on-surface-variant">
          {subtitle}
        </p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
