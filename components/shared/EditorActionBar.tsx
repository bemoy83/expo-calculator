'use client';

/**
 * EditorActionBar Component
 *
 * A fixed bottom action bar for editor pages with backdrop blur and elevation.
 * Provides a persistent action area that stays visible while scrolling.
 * Used in module editor, quote builder, and other editor views.
 *
 * @example
 * ```tsx
 * <EditorActionBar justifyContent="between">
 *   <Button onClick={handleAddField}>
 *     <Plus className="h-4 w-4 mr-2" />
 *     Add Field
 *   </Button>
 *   <div className="flex items-center gap-3">
 *     <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
 *     <Button onClick={handleSubmit}>Save</Button>
 *   </div>
 * </EditorActionBar>
 * ```
 *
 * @example
 * ```tsx
 * // All buttons aligned to the right
 * <EditorActionBar justifyContent="end">
 *   <Button variant="secondary" onClick={handleSecondary}>Secondary Action</Button>
 *   <Button onClick={handlePrimary}>Primary Action</Button>
 * </EditorActionBar>
 * ```
 */

export interface EditorActionBarProps {
  /** Action buttons and other content */
  children: React.ReactNode;
  /** Horizontal alignment of content within the action bar */
  justifyContent?: 'start' | 'end' | 'between' | 'center';
}

const justifyContentMap = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
  center: 'justify-center',
};

export function EditorActionBar({
  children,
  justifyContent = 'between',
}: EditorActionBarProps) {
  const justifyClass = justifyContentMap[justifyContent];

  return (
    <div
      data-bottom-action-bar
      className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2"
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center ${justifyClass} gap-3`}
      >
        {children}
      </div>
    </div>
  );
}
