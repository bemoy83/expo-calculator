'use client';

import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';

interface FunctionEditorActionsProps {
  functionId: string | null;
  isValid: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function FunctionEditorActions({
  functionId,
  isValid,
  onCancel,
  onSubmit,
}: FunctionEditorActionsProps) {
  return (
    <div data-bottom-action-bar className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} className="rounded-full">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!isValid} className="rounded-full">
          <Save className="h-4 w-4 mr-2" />
          {functionId === 'new' ? 'Create Function' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}


