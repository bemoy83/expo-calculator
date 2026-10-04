'use client';

import type { CSSProperties, ReactNode } from 'react';
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
  const hidden = item.type === 'input' && !isShown(context.inputsById.get(item.inputId)?.visibleWhen, context);
  const missing =
    (item.type === 'input' && !context.inputsById.has(item.inputId)) ||
    (item.type === 'result' && !context.calculator.steps.some((step) => step.id === item.stepId));
  const emptyBreakdown = item.type === 'breakdown' && costedParts(context.calculator, item.partIds).length === 0;

  if (missing) return <p className="text-xs italic text-ink-faint">{describeItem(item, context)}</p>;
  if (hidden) {
    const condition = context.inputsById.get((item as { inputId: string }).inputId)?.visibleWhen;
    return (
      <p className="text-xs italic text-ink-faint">
        {describeItem(item, context)} (hidden by its condition
        {condition ? `: shown only when ${describeCondition(condition, context.calculator, context.library)}` : ''})
      </p>
    );
  }
  if (emptyBreakdown) {
    return (
      <p className="text-xs italic text-ink-faint">
        Breakdown: no part in it has a cost yet, so staff don&apos;t see it. Set a part&apos;s cost in the Parts view.
      </p>
    );
  }
  return <CalculatorLayoutItem item={item} context={context} />;
}

// Outlines take no layout space, so selecting never moves the form. The field's own focus ring is
// off so a field never shows two rings.
const ITEM_FRAME = cn(
  'relative rounded-sm outline-offset-[6px] transition-[outline-color] duration-150',
  '[&_input:focus]:!shadow-none [&_select:focus]:!shadow-none [&_textarea:focus]:!shadow-none'
);
const itemOutline = (selected: boolean) =>
  selected ? 'outline outline-[1.5px] outline-accent' : 'hover:outline hover:outline-1 hover:outline-border-strong';

function SelectableItem({
  item,
  context,
  editing,
  selected,
  itemKey,
  className,
}: {
  item: LayoutItem;
  context: LayoutRenderContext;
  editing: LayoutEditing;
  selected: boolean;
  itemKey: string;
  className: string;
}) {
  const select = () => editing.onSelect({ type: 'item', key: itemKey });
  // Selecting on any interaction, so typing a test value also selects the input.
  return (
    <div className={cn(className, ITEM_FRAME, itemOutline(selected))} onMouseDownCapture={select} onFocusCapture={select}>
      <ItemBody item={item} context={context} />
    </div>
  );
}

function SortableItem({
  item,
  context,
  editing,
  selected,
  itemKey,
  className,
}: {
  item: LayoutItem;
  context: LayoutRenderContext;
  editing: LayoutEditing;
  selected: boolean;
  itemKey: string;
  className: string;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey });
  const select = () => editing.onSelect({ type: 'item', key: itemKey });
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
      className={cn(
        className,
        ITEM_FRAME,
        itemOutline(selected || isDragging),
        isDragging && 'bg-canvas shadow-[0_10px_30px_rgb(0_0_0/0.35)]'
      )}
      onMouseDownCapture={select}
      onFocusCapture={select}
    >
      {(selected || isDragging) && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${describeItem(item, context)}`}
          className="absolute -left-6 top-1/2 -translate-y-1/2 rounded p-0 text-accent cursor-grab active:cursor-grabbing touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
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
    const props = {
      item,
      context,
      editing,
      itemKey: keys[index],
      selected: editing.selection?.type === 'item' && editing.selection.key === keys[index],
      className: spanFor(item),
    };
    return editing.arrange ? <SortableItem key={keys[index]} {...props} /> : <SelectableItem key={keys[index]} {...props} />;
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
        'transition-[outline-color] duration-150',
        (selected || dropTarget) && 'outline outline-[1.5px] outline-offset-[14px]',
        selected ? 'outline-accent' : dropTarget && 'outline-dashed outline-accent/60'
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
