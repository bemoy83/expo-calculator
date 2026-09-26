'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EditorPageHeaderProps {
  /** Breadcrumb section, e.g. "Calculators". */
  section: string;
  name: string;
  /** Shown when the name is still empty. */
  placeholderName: string;
  /** Optional validity indicator, e.g. for the formula. */
  status?: { valid: boolean; validLabel: string; invalidLabel: string; detail?: string };
  submitLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSubmit: () => void;
}

// Page header shared by the editors (Quote Builder pattern): breadcrumb and name on the left;
// status and Cancel / Save on the right, in place of a fixed bottom action bar.
export function EditorPageHeader({
  section,
  name,
  placeholderName,
  status,
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
}: EditorPageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted">
          {section} <span aria-hidden="true">/</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink truncate">{name.trim() || placeholderName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status && (
          <span
            className={`inline-flex items-center gap-1.5 mr-1 text-xs font-medium ${status.valid ? 'text-committed' : 'text-danger'}`}
            title={status.valid ? undefined : status.detail}
            role="status"
          >
            {status.valid ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {status.valid ? status.validLabel : status.invalidLabel}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button size="sm" onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
