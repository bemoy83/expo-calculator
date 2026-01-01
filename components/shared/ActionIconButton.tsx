'use client';

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
 *   confirmationMessage={`Are you sure you want to delete "${item.name}"?`}
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
  /** Optional confirmation message - shows window.confirm dialog before action */
  confirmationMessage?: string;
  /** Button shape variant */
  shape?: 'circle' | 'rounded';
  /** Additional CSS classes for custom styling or positioning */
  className?: string;
}

const actionTypeStyles = {
  edit: {
    hoverText: 'hover:text-md-primary',
    hoverBg: 'hover:bg-md-surface-variant',
  },
  delete: {
    hoverText: 'hover:text-destructive',
    hoverBg: 'hover:bg-md-surface-variant',
  },
  duplicate: {
    hoverText: 'hover:text-md-primary',
    hoverBg: 'hover:bg-md-primary/10',
  },
  view: {
    hoverText: 'hover:text-md-primary',
    hoverBg: 'hover:bg-md-surface-variant',
  },
  custom: {
    hoverText: 'hover:text-md-primary',
    hoverBg: 'hover:bg-md-surface-variant',
  },
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
  confirmationMessage,
  shape = 'circle',
  className = '',
}: ActionIconButtonProps) {
  const styles = actionTypeStyles[actionType];
  const shapeClass = shapeStyles[shape];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Stop propagation to prevent triggering parent click handlers
    e.stopPropagation();

    // Show confirmation dialog if message is provided
    if (confirmationMessage) {
      if (window.confirm(confirmationMessage)) {
        onAction();
      }
    } else {
      onAction();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-2 text-md-on-surface-variant ${styles.hoverText} ${styles.hoverBg} ${shapeClass} transition-smooth active:scale-95 z-10 ${className}`}
      aria-label={ariaLabel}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
