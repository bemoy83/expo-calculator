'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ModalDialog Component
 *
 * A centered modal dialog with backdrop overlay. Escape, the close button, and a backdrop
 * click close it. Focus moves into the dialog when it opens (to an element marked
 * `data-autofocus`, else the first focusable one), Tab stays inside it, and focus returns
 * to where it was when it closes. It renders into document.body, so it stacks above the page
 * wherever it is used.
 *
 * @example
 * ```tsx
 * <ModalDialog isOpen={isOpen} onClose={() => setIsOpen(false)} title="Save as template">
 *   <Input label="Name" />
 *   <div className="flex gap-3 justify-end">
 *     <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
 *     <Button onClick={handleSave}>Save</Button>
 *   </div>
 * </ModalDialog>
 * ```
 */

export interface ModalDialogProps {
  /** Controls whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close (Escape key, X button, or backdrop click) */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Maximum width of the modal card */
  maxWidth?: 'small' | 'medium' | 'large' | 'extraLarge' | 'wide';
  /** Allow closing by clicking the backdrop */
  closeOnBackdropClick?: boolean;
  /** Show close button in header */
  showCloseButton?: boolean;
}

const maxWidthMap = {
  small: 'max-w-sm',
  medium: 'max-w-md',
  large: 'max-w-lg',
  extraLarge: 'max-w-xl',
  wide: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement
  );
}

export function ModalDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'medium',
  closeOnBackdropClick = true,
  showCloseButton = true,
}: ModalDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes, focus moves in and is restored on close, body scroll is locked.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ?? focusableIn(panel)[0] ?? panel;
      target.focus();
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  // Keep Tab and Shift+Tab inside the dialog.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = focusableIn(panelRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the panel
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full max-h-[90vh] flex flex-col bg-surface border border-border-strong rounded-[10px] shadow-panel focus:outline-none',
          maxWidthMap[maxWidth]
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
