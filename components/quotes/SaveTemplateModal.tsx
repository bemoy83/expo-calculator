'use client';

import { CheckCircle2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ModalDialog } from '@/components/shared/ModalDialog';

interface SaveTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  templateDescription: string;
  onTemplateNameChange: (value: string) => void;
  onTemplateDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function SaveTemplateModal({
  isOpen,
  templateName,
  templateDescription,
  onTemplateNameChange,
  onTemplateDescriptionChange,
  onClose,
  onSave,
}: SaveTemplateModalProps) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
      maxWidth="medium"
    >
      <div className="space-y-4">
        <Input
          label="Template Name"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          placeholder="e.g., Wall + Finish Setup"
          required
        />

        <Textarea
          label="Description (optional)"
          value={templateDescription}
          onChange={(e) => onTemplateDescriptionChange(e.target.value)}
          placeholder="Describe what this template is used for..."
          rows={3}
        />

        <div className="p-3 bg-muted/50 border border-border rounded-md">
          <p className="text-xs font-medium text-md-on-surface mb-2">This template will save:</p>
          <ul className="space-y-1 text-xs text-md-on-surface-variant">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              Module combinations
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              Field linking relationships
            </li>
            <li className="flex items-center gap-2">
              <X className="h-3 w-3 text-destructive shrink-0" />
              Field values (you&apos;ll enter these when using the template)
            </li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!templateName.trim()}
            className="rounded-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
