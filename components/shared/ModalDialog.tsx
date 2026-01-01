'use client';

import { useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { X } from 'lucide-react';

/**
 * ModalDialog Component
 *
 * A centered modal dialog with backdrop overlay.
 * Supports keyboard navigation (Escape to close) and click-outside to close.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <ModalDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Save as Template"
 *   maxWidth="medium"
 * >
 *   <div className="space-y-4">
 *     <Input label="Template Name" />
 *     <div className="flex gap-3 justify-end">
 *       <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </div>
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
  maxWidth?: 'small' | 'medium' | 'large' | 'extraLarge';
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
};

export function ModalDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'medium',
  closeOnBackdropClick = true,
  showCloseButton = true,
}: ModalDialogProps) {
  const maxWidthClass = maxWidthMap[maxWidth];

  // Handle Escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the card
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Add/remove escape key listener and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card className={`w-full ${maxWidthClass}`}>
        <div className="flex items-center justify-between mb-4">
          <h3
            id="modal-title"
            className="text-lg font-semibold text-md-primary"
          >
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-md-on-surface-variant hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">{children}</div>
      </Card>
    </div>
  );
}
