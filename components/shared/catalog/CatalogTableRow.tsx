'use client';

import React, { createContext, useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CatalogColumn {
  label: string;
  align?: 'right';
}

export interface CatalogCell {
  content: React.ReactNode;
  align?: 'right';
  /** Hidden in the narrow layout, which shows only name and price. */
  hideOnMobile?: boolean;
}

// Which breakpoint shows every column. With the editor panel open the table has less room,
// so it keeps the narrow name-and-price layout up to 2xl. (Literal class strings for Tailwind.)
const LAYOUTS = {
  full: {
    grid: 'md:[grid-template-columns:var(--catalog-cols)]',
    header: 'hidden md:grid',
    wideOnly: 'hidden md:block',
    narrowOnly: 'md:hidden',
  },
  compact: {
    grid: '2xl:[grid-template-columns:var(--catalog-cols)]',
    header: 'hidden 2xl:grid',
    wideOnly: 'hidden 2xl:block',
    narrowOnly: '2xl:hidden',
  },
} as const;

const CatalogLayoutContext = createContext<keyof typeof LAYOUTS>('full');
export const CatalogLayoutProvider = CatalogLayoutContext.Provider;
export const useCatalogLayout = () => LAYOUTS[useContext(CatalogLayoutContext)];

interface CatalogTableRowProps {
  id: string;
  name: string;
  subtitle?: React.ReactNode;
  cells: CatalogCell[];
  isSelected: boolean;
  disableDrag: boolean;
  onOpen: () => void;
}

// One catalog table row. The whole row opens the editor (a stretched button behind the
// name); the drag handle sits above it. Uses the table's `--catalog-cols` from md up.
export function CatalogTableRow({
  id,
  name,
  subtitle,
  cells,
  isSelected,
  disableDrag,
  onOpen,
}: CatalogTableRowProps) {
  const layout = useCatalogLayout();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: disableDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transform ? transition : 'none',
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      aria-selected={isSelected}
      className={cn(
        'group relative grid grid-cols-[20px_minmax(0,1fr)_auto]',
        layout.grid,
        'items-start gap-3 px-3.5 py-2.5 border-b border-border last:border-b-0 transition-colors',
        isSelected
          ? 'bg-action-bg/60 shadow-[inset_2px_0_0_rgb(var(--action))]'
          : 'bg-surface hover:bg-surface-hover',
        isDragging && 'shadow-lg opacity-90'
      )}
    >
      <span role="cell" className="relative z-10 pt-0.5">
        {!disableDrag && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${name}`}
            className="row-action -ml-1 p-0.5 rounded text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-opacity"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </span>
      <span role="cell" className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Edit ${name}`}
          className="block max-w-full text-left text-sm font-semibold text-ink truncate focus:outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-action"
        >
          {name}
        </button>
        {subtitle && (
          <span className="block text-xs font-numeric text-ink-faint truncate">{subtitle}</span>
        )}
      </span>
      {cells.map((cell, index) => (
        <span
          key={index}
          role="cell"
          className={cn(
            'min-w-0',
            cell.align === 'right' && 'text-right',
            cell.hideOnMobile && layout.wideOnly
          )}
        >
          {cell.content}
        </span>
      ))}
    </div>
  );
}

const MAX_LISTED_PROPERTIES = 3;

// Properties column: "name value" per line. A missing-properties row is flagged amber,
// since any module that reads a property of it can't calculate.
export function CatalogPropertiesCell({
  properties,
}: {
  properties: Array<{ id: string; name: string; display: string }>;
}) {
  if (properties.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-numeric text-draft">
        <span className="h-1.5 w-1.5 rounded-full bg-draft" aria-hidden="true" />
        no properties
      </span>
    );
  }
  const listed = properties.slice(0, MAX_LISTED_PROPERTIES);
  const hidden = properties.length - listed.length;
  return (
    <span className="block text-xs leading-relaxed font-numeric text-ink-body">
      {listed.map((prop) => (
        <span key={prop.id} className="block truncate">
          {prop.name} {prop.display}
        </span>
      ))}
      {hidden > 0 && <span className="block text-ink-faint">+{hidden} more</span>}
    </span>
  );
}
