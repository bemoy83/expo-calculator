'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { costedParts, layoutItemKey } from '@/lib/calculator/editing';
import { describeCondition } from '@/lib/calculator/format';
import type { LayoutItem, LayoutSection } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { CalculatorLayoutItem, isShown, type LayoutRenderContext } from './CalculatorLayoutItem';

export type LayoutSelection = { type: 'section'; sectionId: string } | { type: 'item'; key: string } | null;

export const SECTION_DROP = 'section:';

/**
 * What the builder's layout editor adds to a drawn calculator (mockup 1b): items and section
 * eyebrows you can select, and, where `arrange` is set, drag handles. Put on the render context
 * so CalculatorForm itself draws the editable page, and a change to the form changes the editor too.
 */
export interface LayoutEditing {
  selection: LayoutSelection;
  onSelect: (selection: LayoutSelection) => void;
  /** Drag handles and drop targets; otherwise the layout can only be selected in */
  arrange: boolean;
  /** The section an item is being dragged over */
  overSectionId?: string | null;
  /** An item is being dragged: items ignore the pointer, so nothing else reacts to hover on the way */
  dragging?: boolean;
}

function describeItem(item: LayoutItem, context: LayoutRenderContext): string {
  switch (item.type) {
    case 'input':
      return context.inputsById.get(item.inputId)?.label ?? 'Deleted input';
    case 'result':
      return context.calculator.steps.find((step) => step.id === item.stepId)?.label ?? 'Deleted step';
    case 'breakdown':
      return 'Breakdown';
    case 'text':
      return 'Text';
    case 'divider':
      return 'Divider';
  }
}

// One item as staff see it, except that what staff never see (a hidden or deleted input, an empty
// breakdown) is drawn as a quiet note, so it can still be found and selected.
function ItemBody({ item, context }: { item: LayoutItem; context: LayoutRenderContext }) {
  const input = item.type === 'input' ? context.inputsById.get(item.inputId) : undefined;
  const missing =
    (item.type === 'input' && !input) ||
    (item.type === 'result' && !context.calculator.steps.some((step) => step.id === item.stepId));

  if (missing) return <p className="text-xs italic text-ink-faint">{describeItem(item, context)}</p>;
  if (input && !isShown(input.visibleWhen, context)) {
    return (
      <p className="text-xs italic text-ink-faint">
        {describeItem(item, context)} (hidden by its condition
        {input.visibleWhen ? `: shown only when ${describeCondition(input.visibleWhen, context.calculator, context.library)}` : ''})
      </p>
    );
  }
  if (item.type === 'breakdown' && costedParts(context.calculator, item.partIds).length === 0) {
    return (
      <p className="text-xs italic text-ink-faint">
        Breakdown: no part in it has a cost yet, so staff don&apos;t see it. Set a part&apos;s cost in the Parts view.
      </p>
    );
  }
  return <CalculatorLayoutItem item={item} context={context} />;
}

// Outlines take no layout space, so selecting never moves the form. The field's own focus ring is
// off so a field never shows two rings. Selected, a faint accent tint washes the whole outlined
// area, content included (an overlay that ignores the pointer, so it takes no space either).
const ITEM_FRAME = cn(
  'group relative rounded-sm outline-offset-[6px] transition-[outline-color] duration-150',
  '[&_input:focus]:!shadow-none [&_select:focus]:!shadow-none [&_textarea:focus]:!shadow-none'
);
const TINT = "after:pointer-events-none after:absolute after:bg-accent/[0.06] after:content-['']";
const itemOutline = (selected: boolean) =>
  selected
    ? cn('outline outline-[1.5px] outline-accent', TINT, 'after:-inset-1.5 after:rounded-[8px]')
    : 'hover:outline hover:outline-1 hover:outline-border-strong';

interface EditableItemProps {
  item: LayoutItem;
  context: LayoutRenderContext;
  editing: LayoutEditing;
  selected: boolean;
  itemKey: string;
  className: string;
}

// Selecting on any interaction, so typing a test value also selects the input. An input is
// reached by tabbing to its field; the rest (results, text, dividers) hold nothing to focus, so
// their frame is a tab stop itself, and Enter or Space on it selects.
function selectOn(editing: LayoutEditing, itemKey: string, item: LayoutItem, context: LayoutRenderContext) {
  const select = () => editing.onSelect({ type: 'item', key: itemKey });
  return {
    onMouseDownCapture: select,
    onFocusCapture: select,
    ...(item.type !== 'input' && {
      tabIndex: 0,
      role: 'group',
      'aria-label': describeItem(item, context),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          select();
        }
      },
    }),
  };
}

function SelectableItem({ item, context, editing, selected, itemKey, className }: EditableItemProps) {
  return (
    <div className={cn(className, ITEM_FRAME, itemOutline(selected), editing.dragging && 'pointer-events-none')} {...selectOn(editing, itemKey, item, context)}>
      <ItemBody item={item} context={context} />
    </div>
  );
}

function SortableItem({ item, context, editing, selected, itemKey, className }: EditableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // As in the catalog list: the dragged item follows the pointer with no easing; the others glide aside.
    transition: isDragging ? 'none' : transform ? transition : 'none',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, ITEM_FRAME, itemOutline(selected || isDragging), editing.dragging && 'pointer-events-none', isDragging && 'bg-canvas shadow-[0_10px_30px_rgb(0_0_0/0.35)]')}
      {...selectOn(editing, itemKey, item, context)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${describeItem(item, context)}`}
        // 24px wide, so it spans the gap to the item and the pointer keeps the item's hover on its way
        // to it. Until its item is hovered it ignores the pointer, so it never covers a neighbour's edge.
        className={cn(
          'absolute -left-6 top-0 flex h-full w-6 items-center cursor-grab active:cursor-grabbing touch-none transition-opacity duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:opacity-100',
          selected || isDragging
            ? 'text-accent'
            : 'pointer-events-none text-ink-faint opacity-0 group-hover:pointer-events-auto group-hover:opacity-60 hover:!opacity-100'
        )}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <ItemBody item={item} context={context} />
    </div>
  );
}

function EditableGrid({
  section,
  context,
  editing,
  spanFor,
  gridClassName,
}: {
  section: LayoutSection;
  context: LayoutRenderContext;
  editing: LayoutEditing;
  spanFor: (item: LayoutItem) => string;
  gridClassName: string;
}) {
  const keys = section.items.map((item, index) => layoutItemKey(item, section.id, index));
  const items = section.items.map((item, index) => {
    const props: EditableItemProps = {
      item,
      context,
      editing,
      itemKey: keys[index],
      selected: editing.selection?.type === 'item' && editing.selection.key === keys[index],
      className: spanFor(item),
    };
    const Item = editing.arrange ? SortableItem : SelectableItem;
    return <Item key={keys[index]} {...props} />;
  });
  const empty = section.items.length === 0 && (
    <p className="sm:col-span-6 py-3 text-center text-xs text-ink-faint">Empty section. Select it to add something, or drag items here.</p>
  );

  if (!editing.arrange) {
    return (
      <div className={gridClassName}>
        {items}
        {empty}
      </div>
    );
  }
  return <ArrangeableGrid keys={keys} sectionId={section.id} className={gridClassName}>{items}{empty}</ArrangeableGrid>;
}

function ArrangeableGrid({ keys, sectionId, className, children }: { keys: string[]; sectionId: string; className: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `${SECTION_DROP}${sectionId}` });
  return (
    <SortableContext items={keys} strategy={rectSortingStrategy}>
      <div ref={setNodeRef} className={cn(className, 'min-h-[48px]')}>
        {children}
      </div>
    </SortableContext>
  );
}

/** A section in the layout editor: its eyebrow selects it, and its items select (or drag) in place. */
export function EditableSection({
  section,
  context,
  editing,
  spanFor,
  gridClassName,
}: {
  section: LayoutSection;
  context: LayoutRenderContext;
  editing: LayoutEditing;
  spanFor: (item: LayoutItem) => string;
  gridClassName: string;
}) {
  const selected = editing.selection?.type === 'section' && editing.selection.sectionId === section.id;
  const dropTarget = editing.arrange && editing.overSectionId === section.id;
  return (
    <section
      className={cn(
        'relative transition-[outline-color] duration-150',
        (selected || dropTarget) && 'outline outline-[1.5px] outline-offset-[14px]',
        selected ? cn('outline-accent', TINT, 'after:-inset-3.5') : dropTarget && 'outline-dashed outline-accent/60'
      )}
    >
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <button
            type="button"
            onClick={() => editing.onSelect({ type: 'section', sectionId: section.id })}
            aria-pressed={selected}
            className={cn(
              // The same eyebrow as staff see; filled with the accent while selected.
              'rounded-sm px-1 -mx-1 font-numeric text-[11px] font-semibold uppercase tracking-[.06em] text-left',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              selected ? 'bg-accent text-accent-ink' : section.title ? 'text-ink-faint hover:text-ink' : 'text-ink-faint/60 hover:text-ink'
            )}
          >
            {section.title || 'Section'}
          </button>
          {section.visibleWhen && (
            <span
              className="text-[11px] text-ink-faint"
              title={describeCondition(section.visibleWhen, context.calculator, context.library)}
            >
              Conditional{!isShown(section.visibleWhen, context) && ' · hidden now'}
            </span>
          )}
        </div>
        {section.description && <p className="mt-1 text-xs text-ink-muted">{section.description}</p>}
      </div>
      <EditableGrid section={section} context={context} editing={editing} spanFor={spanFor} gridClassName={gridClassName} />
    </section>
  );
}
