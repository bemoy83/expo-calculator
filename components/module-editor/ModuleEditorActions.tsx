'use client';

import { Button } from '@/components/ui/Button';
import { Field } from '@/lib/types';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Plus, Eye } from 'lucide-react';

interface ModuleEditorActionsProps {
  editingModuleId: string | null;
  fields: Field[];
  formulaValidationValid: boolean;
  onAddField: () => void;
  onPreview: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ModuleEditorActions({
  editingModuleId,
  fields,
  formulaValidationValid,
  onAddField,
  onPreview,
  onCancel,
  onSubmit,
}: ModuleEditorActionsProps) {
  return (
    <div data-bottom-action-bar className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <Button onClick={onAddField} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary"
            onClick={onPreview}
            disabled={!formulaValidationValid || fields.length === 0}
            className="rounded-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="ghost" onClick={onCancel} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={onSubmit} className="rounded-full">
            {editingModuleId === 'new' ? 'Create' : 'Update'} Module
          </Button>
        </div>
      </div>
    </div>
  );
}








