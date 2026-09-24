'use client';

import { useCallback, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRight, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { formatInstanceLabel, formatInstanceName, normalizeNickname } from '@/lib/quotes/nickname';
import type { DraftStatus } from '@/lib/quotes/draft-status';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { CalculationModule, Field, QuoteModuleInstance } from '@/lib/types';

interface DraftModuleCardProps {
  instance: QuoteModuleInstance;
  module: CalculationModule;
  /** Position among drafts of the same module ("#2"), so repeated modules stay distinguishable. */
  instanceNumber: number;
  status: DraftStatus;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNicknameChange: (id: string, nickname: string) => void;
  onLockIn: (id: string) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
}

// A draft on the workspace bench (mockup 2a). Expanded: the full form with an amber "not in
// the total" strip, output chips, and the draft cost beside "Lock into quote". Collapsed: a
// compact row with a summary line and "Lock in". A draft that can't calculate gets a danger
// border and can't be locked in.
export function DraftModuleCard({
  instance,
  module,
  instanceNumber,
  status,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  onDuplicate,
  onNicknameChange,
  onLockIn,
  renderFieldInput,
}: DraftModuleCardProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
  });
  const stableRef = useCallback((el: HTMLElement | null) => setNodeRef(el), [setNodeRef]);

  const nickname = normalizeNickname(instance.nickname);
  // Accessible name: the nickname when there is one, otherwise the number, so two unnamed
  // drafts of the same module ("Wall #1", "Wall #2") aren't announced identically.
  const label = nickname
    ? formatInstanceLabel(module.name, instance.nickname)
    : `${module.name} #${instanceNumber}`;
  const blocked = !!status.error;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transform ? transition : 'none',
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 40 : 'auto',
  };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder ${label}`}
      className="-ml-1 p-0.5 rounded text-ink-subtle hover:text-ink cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  const statusChips = (
    <>
      {status.missingRequired > 0 && (
        <StatusChip tone="danger">
          {status.missingRequired} {status.missingRequired === 1 ? 'input' : 'inputs'} needed
        </StatusChip>
      )}
      {blocked && status.missingRequired === 0 && (
        <StatusChip tone="danger" title={status.error}>
          Can&apos;t calculate
        </StatusChip>
      )}
    </>
  );

  const collapseButton = (
    <button
      type="button"
      onClick={() => onToggleCollapse(instance.id)}
      aria-expanded={!isCollapsed}
      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label}`}
      className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      {isCollapsed ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
    </button>
  );

  const discardDialog = (
    <ConfirmDialog
      isOpen={confirmingDiscard}
      title="Discard draft?"
      message={`${nickname ? formatInstanceName(module.name, instance.nickname) : `${module.name} #${instanceNumber}`} will be removed from the workspace. Drafts linked to it keep their current values.`}
      confirmLabel="Discard"
      destructive
      onConfirm={() => {
        setConfirmingDiscard(false);
        onRemove(instance.id);
      }}
      onCancel={() => setConfirmingDiscard(false)}
    />
  );

  if (isCollapsed) {
    return (
      <div
        ref={stableRef}
        style={style}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border',
          blocked ? 'border-danger-border' : 'border-border-strong'
        )}
      >
        {dragHandle}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13.5px] font-semibold text-ink">
              {module.name} <span className="text-[11px] font-numeric font-medium text-ink-faint">#{instanceNumber}</span>
              {nickname && <span className="font-normal text-ink-muted"> · {nickname}</span>}
            </span>
            {statusChips}
          </div>
          {status.summary && (
            <p className="text-[11.5px] font-numeric text-ink-muted truncate">{status.summary}</p>
          )}
        </div>
        <span className={cn('text-[15px] font-semibold font-numeric shrink-0', blocked ? 'text-ink-subtle' : 'text-ink')}>
          {blocked ? '—' : formatCurrency(status.cost)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onLockIn(instance.id)}
          disabled={blocked}
          aria-label={`Lock ${label} into quote`}
          className="text-action shrink-0"
        >
          Lock in
        </Button>
        {collapseButton}
        {discardDialog}
      </div>
    );
  }

  return (
    <article
      ref={stableRef}
      style={style}
      aria-label={label}
      className={cn(
        'rounded-lg bg-surface border shadow-card overflow-hidden',
        blocked ? 'border-danger-border' : 'border-border-strong'
      )}
    >
      <div className="h-[3px] bg-draft" aria-hidden="true" />
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 mb-3.5">
          {dragHandle}
          <h3 className="text-[15px] font-semibold text-ink">{module.name}</h3>
          <span className="text-[11px] font-numeric font-medium text-ink-faint">#{instanceNumber}</span>
          <input
            type="text"
            value={instance.nickname ?? ''}
            onChange={(event) => onNicknameChange(instance.id, event.target.value)}
            placeholder="Nickname"
            maxLength={60}
            aria-label={`Nickname for ${module.name} #${instanceNumber}`}
            className="h-7 w-36 px-2 rounded-[5px] bg-canvas border border-border text-xs font-medium text-ink placeholder:text-ink-subtle focus:outline-none focus:border-action focus:ring-[3px] focus:ring-action/20"
          />
          {statusChips}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => onDuplicate(instance.id)} className={TEXT_ACTION} aria-label={`Duplicate ${label}`}>
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDiscard(true)}
              className={cn(TEXT_ACTION, 'text-danger hover:text-danger hover:bg-danger-bg')}
              aria-label={`Discard ${label}`}
            >
              Discard
            </button>
            {collapseButton}
          </div>
        </div>

        {module.description && <p className="-mt-2 mb-3.5 text-xs text-ink-muted">{module.description}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-4 items-start">
          {module.fields.map((field) => (
            <div key={field.id}>{renderFieldInput(instance, field)}</div>
          ))}
        </div>

        {status.outputs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3.5" aria-label="Computed outputs">
            {status.outputs.map((output) => (
              <span
                key={output.variableName}
                title={output.label}
                className="px-2 py-1 rounded-full bg-action-bg text-[11px] font-numeric font-medium text-action"
              >
                {output.variableName} <span className="text-ink">{output.display}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4 mt-4 pt-3.5 border-t border-border">
          <p className="flex-1 min-w-[12rem] text-xs text-danger" role={blocked ? 'status' : undefined}>
            {status.error}
          </p>
          <div className="text-right">
            <p className="text-[11px] text-ink-muted">Draft cost</p>
            <p className={cn('text-[22px] leading-tight font-semibold font-numeric', blocked ? 'text-ink-subtle' : 'text-ink')}>
              {blocked ? '—' : formatCurrency(status.cost)}
            </p>
          </div>
          <Button onClick={() => onLockIn(instance.id)} disabled={blocked} size="lg" aria-label={`Lock ${label} into quote`}>
            Lock into quote
            <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {discardDialog}
    </article>
  );
}

const TEXT_ACTION =
  'px-1.5 py-1 rounded text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action';

function StatusChip({
  tone,
  title,
  children,
}: {
  tone: 'danger';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        'px-2 py-0.5 rounded-full text-[10.5px] font-medium',
        tone === 'danger' && 'bg-danger-bg text-danger'
      )}
    >
      {children}
    </span>
  );
}
