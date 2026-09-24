'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

/**
 * ActionIconButton Component
 *
 * A small icon button for common actions (edit, delete, duplicate, view).
 * Provides consistent styling and behavior including hover states,
 * optional confirmation dialogs, and accessibility labels.
 *
 * @example
 * ```tsx
 * // Edit button
 * <ActionIconButton
 *   icon={Edit2}
 *   actionType="edit"
 *   onAction={() => handleEdit(item.id)}
 *   ariaLabel={`Edit ${item.name}`}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Delete button with confirmation
 * <ActionIconButton
 *   icon={Trash2}
 *   actionType="delete"
 *   onAction={() => handleDelete(item.id)}
 *   ariaLabel={`Delete ${item.name}`}
 *   confirmation={{ title: `Delete "${item.name}"?`, message: 'This can’t be undone.' }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Custom action with className for positioning
 * <div className="absolute top-4 right-4">
 *   <ActionIconButton
 *     icon={Copy}
 *     actionType="duplicate"
 *     onAction={handleDuplicate}
 *     ariaLabel="Duplicate template"
 *   />
 * </div>
 * ```
 */

export interface ActionIconButtonProps {
  /** Lucide icon component to display */
  icon: React.ElementType;
  /** Action type - determines hover styling and semantic meaning */
  actionType: 'edit' | 'delete' | 'duplicate' | 'view' | 'custom';
  /** Click handler - called after confirmation (if any) */
  onAction: () => void;
  /** Accessible label describing the action (required for accessibility) */
  ariaLabel: string;
  /** Optional confirmation - shows an in-app dialog (short title, optional message) before the action */
  confirmation?: { title: string; message?: string };
  /** Label for the dialog's confirm button (defaults to "Delete" for delete actions, else "Confirm") */
  confirmLabel?: string;
  /** Button shape variant */
  shape?: 'circle' | 'rounded';
  /** Additional CSS classes for custom styling or positioning */
  className?: string;
}

const actionTypeStyles = {
  edit: 'hover:text-ink hover:bg-surface-hover',
  delete: 'hover:text-danger hover:bg-danger-bg',
  duplicate: 'hover:text-ink hover:bg-surface-hover',
  view: 'hover:text-ink hover:bg-surface-hover',
  custom: 'hover:text-ink hover:bg-surface-hover',
};

const shapeStyles = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
};

export function ActionIconButton({
  icon: Icon,
  actionType,
  onAction,
  ariaLabel,
  confirmation,
  confirmLabel,
  shape = 'circle',
  className = '',
}: ActionIconButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const hoverClass = actionTypeStyles[actionType];
  const shapeClass = shapeStyles[shape];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Stop propagation to prevent triggering parent click handlers
    e.stopPropagation();

    if (confirmation) {
      setIsConfirming(true);
    } else {
      onAction();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`p-2 text-ink-muted ${hoverClass} ${shapeClass} transition-smooth active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-action z-10 ${className}`}
        aria-label={ariaLabel}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
      {confirmation && (
        <ConfirmDialog
          isOpen={isConfirming}
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmLabel ?? (actionType === 'delete' ? 'Delete' : 'Confirm')}
          destructive={actionType === 'delete'}
          onConfirm={() => {
            setIsConfirming(false);
            onAction();
          }}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </>
  );
}
