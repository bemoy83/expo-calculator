'use client';

import { Check, Minus, Save } from 'lucide-react';
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
      title="Save as template"
      maxWidth="medium"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <Input
          label="Template name"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          placeholder="e.g., Wall + Finish Setup"
          required
          data-autofocus
        />

        <Textarea
          label="Description (optional)"
          value={templateDescription}
          onChange={(e) => onTemplateDescriptionChange(e.target.value)}
          placeholder="Describe what this template is used for..."
          rows={3}
        />

        <div className="px-3.5 py-3 bg-sunken border border-border rounded-md">
          <p className="text-xs font-medium text-ink mb-2">The template saves</p>
          <ul className="space-y-1 text-xs text-ink-body">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-committed shrink-0" aria-hidden="true" />
              The workspace&apos;s modules, in order
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-committed shrink-0" aria-hidden="true" />
              The links between their fields
            </li>
            <li className="flex items-center gap-2">
              <Minus className="h-3.5 w-3.5 text-ink-faint shrink-0" aria-hidden="true" />
              Not the values: each quote starts from defaults
            </li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!templateName.trim()}>
            <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Save template
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
