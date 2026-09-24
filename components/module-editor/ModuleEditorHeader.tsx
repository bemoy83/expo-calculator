'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ModuleEditorHeaderProps {
  editingModuleId: string | null;
  moduleName: string;
  formulaValid: boolean;
  formulaError?: string;
  onCancel: () => void;
  onSubmit: () => void;
}

// Page header in the Quote Builder's pattern: breadcrumb and name on the left; formula status
// and Cancel / Save on the right (replaces the old fixed bottom action bar).
export function ModuleEditorHeader({
  editingModuleId,
  moduleName,
  formulaValid,
  formulaError,
  onCancel,
  onSubmit,
}: ModuleEditorHeaderProps) {
  if (!editingModuleId) return null;
  const isNew = editingModuleId === 'new';

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted">
          Modules <span aria-hidden="true">/</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink truncate">
          {moduleName.trim() || (isNew ? 'New module' : 'Untitled module')}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 mr-1 text-xs font-medium ${formulaValid ? 'text-committed' : 'text-danger'}`}
          title={formulaValid ? undefined : formulaError}
          role="status"
        >
          {formulaValid ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {formulaValid ? 'Formula valid' : 'Formula needs attention'}
        </span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit}>
          {isNew ? 'Create module' : 'Save module'}
        </Button>
      </div>
    </div>
  );
}
