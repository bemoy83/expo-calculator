'use client';

import { memo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import {
  CalculatorLayoutItem,
  SectionHeading,
  isResultSection,
  isShown,
  itemSpan,
  type LayoutRenderContext,
} from '@/components/calculator/CalculatorLayoutItem';
import { costedParts, findLayoutItem, layoutItemKey, type LayoutPosition } from '@/lib/calculator/editing';
import { describeCondition } from '@/lib/calculator/format';
import type { LayoutItem, LayoutSection } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';

export type LayoutSelection = { type: 'section'; sectionId: string } | { type: 'item'; key: string } | null;

const SECTION_DROP = 'section:';

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

// One item as staff see it, for the canvas and for the drag overlay.
function ItemBody({ item, context }: { item: LayoutItem; context: LayoutRenderContext }) {
  const hidden = item.type === 'input' && !isShown(context.inputsById.get(item.inputId)?.visibleWhen, context);
  const missing =
    (item.type === 'input' && !context.inputsById.has(item.inputId)) ||
    (item.type === 'result' && !context.calculator.steps.some((step) => step.id === item.stepId));
  const emptyBreakdown = item.type === 'breakdown' && costedParts(context.calculator, item.partIds).length === 0;

  if (missing) return <p className="text-xs italic text-ink-faint">{describeItem(item, context)}</p>;
  if (hidden) return <p className="text-xs italic text-ink-faint">{describeItem(item, context)} (hidden by its condition)</p>;
  if (emptyBreakdown) {
    return (
      <p className="text-xs italic text-ink-faint">
        Breakdown: no part in it has a cost yet, so staff don&apos;t see it. Set a part&apos;s cost in the Parts view.
      </p>
    );
  }
  return <CalculatorLayoutItem item={item} context={context} />;
}

function CanvasItem({
  item,
  itemKey,
  context,
  selected,
  preview,
  onSelect,
}: {
  item: LayoutItem;
  itemKey: string;
  context: LayoutRenderContext;
  selected: boolean;
  preview: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
    disabled: preview,
  });

  if (preview) {
    return (
      <div className={itemSpan(item)}>
        <ItemBody item={item} context={context} />
      </div>
    );
  }

  const condition = item.type === 'input' ? context.inputsById.get(item.inputId)?.visibleWhen : undefined;
  const conditionText = condition ? `Shown only when ${describeCondition(condition, context.calculator, context.library)}` : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        // As in the catalog list: the dragged item follows the pointer with no easing; the others glide aside.
        transition: isDragging ? 'none' : transform ? transition : 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        itemSpan(item),
        'group relative flex items-stretch gap-1 rounded-lg border-[1.5px] border-dashed py-2.5 pl-1 pr-2.5 transition-colors duration-150',
        // The field's own focus ring would double up with the selection frame.
        '[&_input:focus]:!shadow-none [&_select:focus]:!shadow-none [&_textarea:focus]:!shadow-none',
        isDragging
          ? 'border-accent bg-canvas shadow-[0_10px_30px_rgb(0_0_0/0.35)]'
          : selected
            ? 'border-accent bg-accent/[0.04]'
            : 'border-transparent hover:border-border-strong'
      )}
      // Selecting on any interaction, so typing a test value also selects the input.
      onMouseDownCapture={onSelect}
      onFocusCapture={onSelect}
    >
      {/* The handle's own column, inside the frame, like the catalog rows. */}
      <div className="flex w-5 flex-none items-center justify-center">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${describeItem(item, context)}`}
          className={cn(
            'row-action rounded p-0.5 text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing touch-none transition-opacity',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
            (selected || isDragging) && '!opacity-100 text-accent hover:text-accent'
          )}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <ItemBody item={item} context={context} />
      </div>
      {conditionText && (
        <span
          title={conditionText}
          className="pointer-events-none absolute -top-[9px] right-2.5 max-w-[65%] truncate rounded-sm border border-border bg-canvas px-1.5 py-px text-[10px] leading-4 text-ink-muted"
        >
          {conditionText}
        </span>
      )}
    </div>
  );
}

function CanvasSection({
  section,
  context,
  selection,
  preview,
  dropTarget,
  onSelect,
}: {
  section: LayoutSection;
  context: LayoutRenderContext;
  selection: LayoutSelection;
  preview: boolean;
  /** An item is being dragged over this section */
  dropTarget: boolean;
  onSelect: (selection: LayoutSelection) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `${SECTION_DROP}${section.id}`, disabled: preview });
  const keys = section.items.map((item, index) => layoutItemKey(item, section.id, index));
  const sectionSelected = selection?.type === 'section' && selection.sectionId === section.id;

  return (
    <section
      className={cn(
        'px-2.5 py-3.5 rounded-lg bg-canvas border border-border-strong transition-[outline-color] duration-150',
        !preview && sectionSelected && 'outline outline-[1.5px] outline-dashed outline-offset-2 outline-accent',
        !preview && dropTarget && !sectionSelected && 'outline outline-[1.5px] outline-dashed outline-offset-2 outline-accent/60'
      )}
    >
      {preview ? (
        <SectionHeading section={section} />
      ) : (
        // One header row: the section's selectable chip, its title, then what's hidden about it.
        <div className="mb-2.5 px-2.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <button
              type="button"
              onClick={() => onSelect({ type: 'section', sectionId: section.id })}
              aria-pressed={sectionSelected}
              className={cn(
                'inline-flex items-center rounded-sm px-1.5 py-0.5 font-numeric text-[11px] uppercase tracking-[.06em]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                sectionSelected ? 'bg-accent text-accent-ink font-semibold' : 'bg-sunken text-ink-faint hover:text-ink'
              )}
            >
              Section
            </button>
            {section.title && <Eyebrow as="h2">{section.title}</Eyebrow>}
            {section.visibleWhen && (
              <span
                className="rounded-sm border border-border px-1.5 py-px text-[10px] leading-4 text-ink-muted"
                title={describeCondition(section.visibleWhen, context.calculator, context.library)}
              >
                Conditional{!isShown(section.visibleWhen, context) && ' · hidden now'}
              </span>
            )}
          </div>
          {section.description && <p className="mt-1.5 text-xs text-ink-muted">{section.description}</p>}
        </div>
      )}
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={cn('grid grid-cols-1 sm:grid-cols-6 gap-2.5', !preview && 'min-h-[48px]')}>
          {section.items.map((item, index) => (
            <CanvasItem
              key={keys[index]}
              item={item}
              itemKey={keys[index]}
              context={context}
              selected={selection?.type === 'item' && selection.key === keys[index]}
              preview={preview}
              onSelect={() => onSelect({ type: 'item', key: keys[index] })}
            />
          ))}
          {!preview && section.items.length === 0 && (
            <p className="sm:col-span-6 py-3 text-center text-xs text-ink-faint">
              Empty section. Drag items here, or select the section to add some.
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

// Drop where the pointer is: an item under it wins over the section behind it; in the gaps, the
// nearest centre.
const collision: CollisionDetection = (args) => {
  const under = pointerWithin(args);
  const items = under.filter((hit) => !String(hit.id).startsWith(SECTION_DROP));
  if (items.length) return items;
  if (under.length) return under;
  return closestCenter(args);
};

// The page staff see, drawn live, with each item selectable and draggable within and between
// sections. In preview it is exactly the staff view.
// Memoized on the data props only: `onSelect`/`onMove`/`onAddSection` are fresh closures every
// CalculatorBuilder render, but behaviorally stable whenever `context`/`selection`/`preview`
// haven't changed — so it's safe to bail without comparing them.
export const LayoutCanvas = memo(function LayoutCanvas({
  context,
  selection,
  preview,
  onSelect,
  onMove,
  onAddSection,
}: {
  context: LayoutRenderContext;
  selection: LayoutSelection;
  preview: boolean;
  onSelect: (selection: LayoutSelection) => void;
  onMove: (from: LayoutPosition, to: LayoutPosition) => void;
  onAddSection: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { calculator } = context;
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const visible = calculator.layout.filter((section) => !preview || isShown(section.visibleWhen, context));
  // One column, as on a phone: input sections, then the sections holding only results.
  const ordered = [...visible.filter((section) => !isResultSection(section)), ...visible.filter(isResultSection)];

  const handleDragOver = ({ over }: DragOverEvent) => {
    const overId = over ? String(over.id) : null;
    setOverSectionId(
      !overId ? null : overId.startsWith(SECTION_DROP) ? overId.slice(SECTION_DROP.length) : (findLayoutItem(calculator, overId)?.sectionId ?? null)
    );
  };

  const clearDrag = () => setOverSectionId(null);

  // After dnd-kit has cleared its transforms, so the item doesn't jump back for a frame first.
  const commitMove = (from: LayoutPosition, to: LayoutPosition) => requestAnimationFrame(() => onMove(from, to));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    clearDrag();
    if (!over || active.id === over.id) return;
    const from = findLayoutItem(calculator, String(active.id));
    if (!from) return;
    const overId = String(over.id);
    if (overId.startsWith(SECTION_DROP)) {
      const sectionId = overId.slice(SECTION_DROP.length);
      const section = calculator.layout.find((candidate) => candidate.id === sectionId);
      if (!section) return;
      const end = from.sectionId === sectionId ? section.items.length - 1 : section.items.length;
      commitMove(from, { sectionId, index: end });
      return;
    }
    const to = findLayoutItem(calculator, overId);
    if (to) commitMove(from, to);
  };

  const renderSection = (section: LayoutSection) => (
    <CanvasSection
      key={section.id}
      section={section}
      context={context}
      selection={selection}
      preview={preview}
      dropTarget={overSectionId === section.id}
      onSelect={onSelect}
    />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDrag}
    >
      <div className="flex flex-col gap-4">
        {ordered.map(renderSection)}
        {!preview && (
          <button
            type="button"
            onClick={onAddSection}
            className="w-full p-3 rounded-lg border border-dashed border-border-strong text-center text-[13px] text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
          >
            + Add section
          </button>
        )}
      </div>
    </DndContext>
  );
},
(prev, next) =>
  prev.context.calculator === next.context.calculator &&
  prev.context.values === next.context.values &&
  prev.context.result === next.context.result &&
  prev.context.library === next.context.library &&
  prev.context.formatMoney === next.context.formatMoney &&
  prev.context.required === next.context.required &&
  prev.selection === next.selection &&
  prev.preview === next.preview
);
