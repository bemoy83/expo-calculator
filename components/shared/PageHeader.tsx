import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Status dot beside the title, e.g. the builder's "1 step has an error" */
  status?: { tone: 'ok' | 'error'; label: string };
  /** Underline the title as editable (builder) */
  editing?: boolean;
  actions?: React.ReactNode;
  /** Sub-navigation under the title, e.g. <CatalogTabs/>; the band then has no bottom padding */
  children?: React.ReactNode;
  className?: string;
}

// Full-bleed page header band (Ledger shell/PageHeader.jsx): eyebrow, 30px title, status or
// description, actions on the right, optional sub-tabs underneath.
export function PageHeader({ eyebrow, title, description, status, editing = false, actions, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-4 gap-y-3 px-4 sm:px-6 pt-[22px] border-b border-border text-ink',
        children ? 'pb-0' : 'pb-[18px]',
        className
      )}
    >
      {/* Wide enough for the title; on a phone the actions wrap underneath. */}
      <div className="flex-1 min-w-[min(100%,16rem)]">
        {eyebrow && <div className="font-numeric text-xs uppercase tracking-[.04em] text-ink-faint">{eyebrow}</div>}
        <div className="flex flex-wrap items-baseline gap-3.5 mt-1">
          <h1
            className={cn(
              'text-[30px] font-bold tracking-[-.025em] leading-[1.15]',
              editing && 'border-b border-border-strong'
            )}
          >
            {title}
          </h1>
          {status && (
            <span
              className={cn(
                'flex items-center gap-[7px] text-[13px]',
                status.tone === 'error' ? 'text-danger' : 'text-committed'
              )}
            >
              <span
                aria-hidden="true"
                className={cn('w-[7px] h-[7px] rounded-full', status.tone === 'error' ? 'bg-danger' : 'bg-committed')}
              />
              {status.label}
            </span>
          )}
        </div>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
        {children && <div className="mt-3.5">{children}</div>}
      </div>
      {actions && <div className={cn('flex flex-wrap items-center gap-2', children && 'pb-3.5')}>{actions}</div>}
    </div>
  );
}
