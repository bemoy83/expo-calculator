'use client';

import React, { useState } from 'react';
import { Edit2, Info, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CatalogEditorPanelProps {
  /** Eyebrow, e.g. "Edit material" */
  title: string;
  /** The item's name, shown large under the eyebrow */
  heading: string;
  /** Above the buttons, e.g. "Used by 3 calculators. Price changes apply…"; omitted while creating. */
  note?: React.ReactNode;
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
  heading,
  note,
  submitLabel,
  onSubmit,
  onClose,
  onDelete,
  deleteName,
  children,
}: CatalogEditorPanelProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <aside aria-label={title} className="h-full flex flex-col">
      <form onSubmit={onSubmit} className="h-full flex flex-col min-h-0 px-6 py-5 gap-4" noValidate>
        <div>
          <div className="flex items-center justify-between gap-3">
            <Eyebrow as="h2">{title}</Eyebrow>
            <IconButton
              label="Close editor"
              icon={<X className="h-4 w-4" aria-hidden="true" />}
              onClick={onClose}
              size="sm"
              className="-mr-1.5"
            />
          </div>
          <p className="mt-4 pb-1.5 border-b border-border-strong text-[22px] font-bold tracking-[-.02em] text-ink break-words">
            {heading}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">{children}</div>

        <div className="flex flex-col gap-3">
          {note && <p className="text-[13px] leading-[1.45] text-ink-muted">{note}</p>}
          <div className="flex gap-2">
            {onDelete && (
              <IconButton
                label="Delete"
                variant="danger"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setConfirmingDelete(true)}
                className="h-[46px] w-[46px] rounded-row bg-field"
              />
            )}
            <Button type="submit" variant="primary" block className="flex-1 h-auto py-3 text-sm">
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {onDelete && (
        <ConfirmDialog
          isOpen={confirmingDelete}
          title="Delete item?"
          message={`"${deleteName}" will be permanently deleted. Calculators and functions that use it by name will report a missing name.`}
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

// Help text in the panel, not a field: how the item reads in formulas, e.g. `mdf18` → 142.00 kr / m².
// No fill, so it can't be taken for an input.
export function FormulaReference({ variableName, value }: { variableName: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-[1.5] text-ink-muted">
      <Info className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      <p>
        In formulas this is{' '}
        <code className="font-numeric font-medium text-token-input">{variableName || '…'}</code>
        <span aria-hidden="true"> → </span>
        <span className="sr-only">, which is </span>
        <span className="font-numeric text-ink">{value}</span>
      </p>
    </div>
  );
}

export function PanelSectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-3.5 border-t border-border">
      <Eyebrow as="h3">{children}</Eyebrow>
      {aside}
    </div>
  );
}

// A saved property as a result line (mockup 3c): its formula reference, a dotted leader and its
// value, with edit and remove. The property's name is in the tooltip and the buttons' labels.
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
    <div className="group flex items-baseline gap-2.5 py-1 text-sm">
      <code title={name} className="min-w-0 truncate font-numeric text-token-input">
        {reference}
      </code>
      <span aria-hidden="true" className="flex-1 min-w-4 border-b border-dotted border-border-strong" />
      <span className="font-numeric text-ink shrink-0">{value}</span>
      <div className="flex shrink-0 self-center">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit property ${name}`}
          className="row-action p-1 rounded text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove property ${name}`}
          className="row-action p-1 rounded text-ink-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
