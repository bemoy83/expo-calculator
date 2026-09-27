import React from 'react';
import { cn } from '@/lib/utils';

interface CommitBlockProps {
  /** stack: receipt / run view pane · row: resume card · compact: pinned quick-view footer */
  layout?: 'stack' | 'row' | 'compact';
  /** row only */
  eyebrow?: React.ReactNode;
  /** row only */
  title?: React.ReactNode;
  /** row only */
  meta?: React.ReactNode;
  label?: React.ReactNode;
  amount: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** e.g. "Adds a line to Stand B12" */
  note?: React.ReactNode;
  className?: string;
}

function Pill({ amount, size }: { amount: React.ReactNode; size: 'lg' | 'md' | 'sm' }) {
  return (
    <span
      className={cn(
        'self-start font-numeric font-semibold tracking-[-0.04em] leading-[1.15] whitespace-nowrap bg-accent text-accent-ink',
        size === 'lg' && 'text-[40px] px-3 py-0.5 rounded-row',
        size === 'md' && 'text-[32px] px-3 py-0.5 rounded-row',
        size === 'sm' && 'text-[26px] px-2.5 py-px rounded-md'
      )}
    >
      {amount}
    </span>
  );
}

function Cta({ label, onAction, disabled, block }: { label: React.ReactNode; onAction?: () => void; disabled?: boolean; block?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className={cn(
        'rounded-row bg-inverse-ink text-inverse text-sm font-semibold whitespace-nowrap',
        'transition-opacity duration-150 ease-[cubic-bezier(.4,0,.2,1)] hover:opacity-90',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-inverse',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        block ? 'w-full p-3' : 'px-5 py-3'
      )}
    >
      {label}
    </button>
  );
}

// The inverted ink block, at most one per screen (Ledger live/CommitBlock.jsx): the money total
// on an accent pill and the action that commits it.
export function CommitBlock({
  layout = 'stack',
  eyebrow,
  title,
  meta,
  label = 'Total',
  amount,
  actionLabel,
  onAction,
  actionDisabled,
  note,
  className,
}: CommitBlockProps) {
  const base = 'bg-inverse text-inverse-ink';

  if (layout === 'row') {
    return (
      <div className={cn(base, 'flex items-center gap-6 px-[22px] py-[18px] rounded-inverse', className)}>
        <div className="flex-1 min-w-0">
          {eyebrow && <div className="font-numeric text-xs tracking-[.06em] uppercase opacity-60">{eyebrow}</div>}
          {title && <div className="mt-2 text-xl font-bold tracking-[-.015em]">{title}</div>}
          {meta && <div className="mt-1 font-numeric text-xs opacity-60">{meta}</div>}
        </div>
        <div className="flex items-baseline gap-3.5">
          <span className="text-sm opacity-70">{label}</span>
          <Pill amount={amount} size="md" />
        </div>
        {actionLabel && <Cta label={actionLabel} onAction={onAction} disabled={actionDisabled} />}
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className={cn(base, 'flex items-center gap-3.5 py-3 pr-3.5 pl-4 rounded-lg', className)}>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-xs opacity-70">{label}</span>
          <Pill amount={amount} size="sm" />
        </div>
        <div className="flex flex-col items-end gap-[5px]">
          {actionLabel && <Cta label={actionLabel} onAction={onAction} disabled={actionDisabled} />}
          {note && <span className="text-[11px] opacity-60">{note}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(base, 'flex flex-col gap-3 p-[18px] rounded-inverse', className)}>
      <span className="text-[13px] opacity-70">{label}</span>
      <Pill amount={amount} size="lg" />
      {actionLabel && (
        <div className="mt-1">
          <Cta label={actionLabel} onAction={onAction} disabled={actionDisabled} block />
        </div>
      )}
      {note && <div className="text-xs opacity-60 text-center">{note}</div>}
    </div>
  );
}
