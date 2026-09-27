'use client';

import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/shared/ModalDialog';

export interface SaveChangesDialogProps {
  isOpen: boolean;
  /** What's being edited, e.g. the calculator's name. */
  name: string;
  onSave: () => void;
  onDiscard: () => void;
  /** Keep editing: stay on the page with the edits. */
  onCancel: () => void;
}

// The one question every editor asks when leaving with unsaved edits (Close, breadcrumb, top
// bar): Save, Discard or Keep editing. Escape and the X keep editing, as does the focused button.
export function SaveChangesDialog({ isOpen, name, onSave, onDiscard, onCancel }: SaveChangesDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    // As in ConfirmDialog: stop events at the dialog boundary and handle Escape here.
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') onCancel();
      }}
    >
      <ModalDialog isOpen onClose={onCancel} title={`Save changes to ${name}?`} maxWidth="medium">
        <p className="text-sm text-ink-body">Your changes aren&rsquo;t saved. If you discard them, they&rsquo;re gone.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="danger" onClick={onDiscard} className="-ml-3.5">
            Discard
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="ml-auto" data-autofocus>
            Keep editing
          </Button>
          <Button type="button" variant="primary" onClick={onSave}>
            Save
          </Button>
        </div>
      </ModalDialog>
    </div>,
    document.body
  );
}
