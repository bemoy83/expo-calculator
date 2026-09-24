'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CatalogEditorPanelProps {
  title: string;
  /** e.g. "used in 4 modules"; omitted while creating. */
  subtitle?: string;
  submitLabel: string;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  /** Present when editing an existing item. */
  onDelete?: () => void;
  deleteName?: string;
  children: React.ReactNode;
}

// Side-panel frame shared by the Materials and Labor editors: header, scrolling form body,
// and a Delete / Cancel / Save footer.
export function CatalogEditorPanel({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  onClose,
  onDelete,
  deleteName,
  children,
}: CatalogEditorPanelProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <aside
      aria-label={title}
      className="flex flex-col rounded-lg border border-border-strong bg-surface shadow-[0_8px_24px_rgb(0_0_0/0.08)] lg:max-h-[calc(100vh-var(--app-header-h)-3rem)]"
    >
      <form onSubmit={onSubmit} className="flex flex-col min-h-0" noValidate>
        <div className="flex items-start gap-3 px-4 py-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="p-1 -mr-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">{children}</div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              className="text-danger hover:text-danger"
            >
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {submitLabel}
          </Button>
        </div>
      </form>

      {onDelete && (
        <ConfirmDialog
          isOpen={confirmingDelete}
          title="Delete item?"
          message={`"${deleteName}" will be permanently deleted. Modules that reference it by name will report a missing variable.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </aside>
  );
}

// Shown in the panel: how the item reads in formulas, e.g. `mdf18` → 142.00 kr / m².
export function FormulaReference({ variableName, value }: { variableName: string; value: string }) {
  return (
    <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-muted">
      In formulas this is{' '}
      <code className="font-numeric font-medium text-action">{variableName || '…'}</code>
      <span aria-hidden="true"> → </span>
      <span className="sr-only">, which is </span>
      <span className="font-numeric text-ink">{value}</span>
    </div>
  );
}

export function PanelSectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{children}</h3>
      {aside}
    </div>
  );
}

// A saved property: its name, its formula reference, and its value, with edit and remove.
export function CatalogPropertyRow({
  name,
  reference,
  value,
  onEdit,
  onRemove,
}: {
  name: string;
  reference: string;
  value: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 py-2 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{name}</p>
        <code className="block text-xs font-numeric text-action truncate">{reference}</code>
      </div>
      <span className="text-sm font-numeric text-ink-body shrink-0">{value}</span>
      <div className="flex shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit property ${name}`}
          className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove property ${name}`}
          className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-danger-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
