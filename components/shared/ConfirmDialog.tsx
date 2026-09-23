'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/shared/ModalDialog';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm, which some browsers and embedded webviews
 * block by returning false without showing anything.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    containerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    // React events bubble out of portals to the trigger's ancestors (e.g. a clickable card
    // header), so stop them at the dialog boundary. Stopping keydown also keeps it from reaching
    // ModalDialog's document-level Escape listener, so Escape is handled here.
    <div
      ref={containerRef}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') onCancel();
      }}
    >
      <ModalDialog isOpen onClose={onCancel} title={title} maxWidth="medium">
        {message && (
          <p className="text-sm text-md-on-surface-variant whitespace-pre-line">{message}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </ModalDialog>
    </div>,
    document.body
  );
}
