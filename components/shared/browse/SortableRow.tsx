'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// A list row the user can drag, for the lists that aren't tables (calculators, functions): a
// handle column, then the row itself. Selected = a surface card with the accent ring, from lg.
// The handle column stays when dragging is off, so rows line up either way.
export function SortableRow({
  id,
  label,
  selected,
  disableDrag,
  children,
}: {
  id: string;
  /** Names the handle: "Drag to reorder {label}" */
  label: string;
  selected: boolean;
  disableDrag: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: disableDrag });

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transform ? transition : 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        'group relative flex items-stretch border border-transparent border-b-border transition-colors duration-150',
        selected
          ? 'lg:rounded-row lg:bg-surface lg:border-accent lg:shadow-focus hover:rounded-md lg:hover:rounded-row'
          : 'hover:bg-surface hover:rounded-md',
        isDragging && 'bg-surface rounded-row opacity-90'
      )}
    >
      <span className="flex w-5 flex-none items-center pl-1.5">
        {!disableDrag && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${label}`}
            className="row-action -ml-1 rounded p-0.5 text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-opacity"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
