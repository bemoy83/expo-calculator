'use client';

import { memo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey, disabled: preview });
  const rendered = <CalculatorLayoutItem item={item} context={context} />;
  const hidden = item.type === 'input' && !isShown(context.inputsById.get(item.inputId)?.visibleWhen, context);
  const missing =
    (item.type === 'input' && !context.inputsById.has(item.inputId)) ||
    (item.type === 'result' && !context.calculator.steps.some((step) => step.id === item.stepId));
  const emptyBreakdown = item.type === 'breakdown' && costedParts(context.calculator, item.partIds).length === 0;

  if (preview) {
    return <div className={itemSpan(item)}>{rendered}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        itemSpan(item),
        'relative group rounded-md p-1.5 -m-1.5 outline-offset-0 transition-[outline-color]',
        selected ? 'outline outline-2 outline-accent' : 'outline outline-1 outline-transparent hover:outline-border-strong',
        isDragging && 'z-10 opacity-80 bg-surface'
      )}
      // Selecting on any interaction, so typing a test value also selects the input.
      onMouseDownCapture={onSelect}
      onFocusCapture={onSelect}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${describeItem(item, context)}`}
        className={cn(
          'absolute -left-5 top-1.5 p-0.5 rounded text-ink-faint hover:text-ink cursor-grab active:cursor-grabbing',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        )}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {item.type === 'input' && context.inputsById.get(item.inputId)?.visibleWhen && (
        <p className="mb-1 text-[11px] text-ink-muted">
          Shown only when {describeCondition(context.inputsById.get(item.inputId)!.visibleWhen!, context.calculator, context.library)}
        </p>
      )}
      {missing ? (
        <p className="text-xs italic text-ink-faint">{describeItem(item, context)}</p>
      ) : hidden ? (
        <p className="text-xs italic text-ink-faint">{describeItem(item, context)} (hidden by its condition)</p>
      ) : emptyBreakdown ? (
        <p className="text-xs italic text-ink-faint">
          Breakdown: no part in it has a cost yet, so staff don&apos;t see it. Set a part&apos;s cost in the Parts view.
        </p>
      ) : (
        rendered
      )}
    </div>
  );
}

function CanvasSection({
  section,
  context,
  selection,
  preview,
  onSelect,
}: {
  section: LayoutSection;
  context: LayoutRenderContext;
  selection: LayoutSelection;
  preview: boolean;
  onSelect: (selection: LayoutSelection) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${SECTION_DROP}${section.id}`, disabled: preview });
  const keys = section.items.map((item, index) => layoutItemKey(item, section.id, index));
  const sectionSelected = selection?.type === 'section' && selection.sectionId === section.id;

  return (
    <section
      className={cn(
        'px-[18px] py-4 rounded-lg bg-canvas border border-border-strong',
        !preview && sectionSelected && 'outline outline-2 outline-accent',
        !preview && isOver && 'outline outline-2 outline-dashed outline-accent/60'
      )}
    >
      {!preview && (
        <button
          type="button"
          onClick={() => onSelect({ type: 'section', sectionId: section.id })}
          aria-pressed={sectionSelected}
          className={cn(
            '-mt-1 mb-2 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-numeric text-[11px] uppercase tracking-[.06em]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
            sectionSelected ? 'bg-accent text-accent-ink font-semibold' : 'bg-sunken text-ink-faint hover:text-ink'
          )}
        >
          Section{section.title ? ` · ${section.title}` : ''}
        </button>
      )}
      {!preview && section.visibleWhen && (
        <p className="-mt-1 mb-2 text-[11px] text-ink-muted">
          Shown only when {describeCondition(section.visibleWhen, context.calculator, context.library)}
          {!isShown(section.visibleWhen, context) && ' (hidden now)'}
        </p>
      )}
      <SectionHeading section={section} />
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={cn('grid grid-cols-1 sm:grid-cols-6 gap-3', !preview && 'min-h-[48px]')}>
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
  const visible = calculator.layout.filter((section) => !preview || isShown(section.visibleWhen, context));
  // One column, as on a phone: input sections, then the sections holding only results.
  const ordered = [...visible.filter((section) => !isResultSection(section)), ...visible.filter(isResultSection)];

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = findLayoutItem(calculator, String(active.id));
    if (!from) return;
    const overId = String(over.id);
    if (overId.startsWith(SECTION_DROP)) {
      const sectionId = overId.slice(SECTION_DROP.length);
      const section = calculator.layout.find((candidate) => candidate.id === sectionId);
      if (!section) return;
      const end = from.sectionId === sectionId ? section.items.length - 1 : section.items.length;
      onMove(from, { sectionId, index: end });
      return;
    }
    const to = findLayoutItem(calculator, overId);
    if (to) onMove(from, to);
  };

  const renderSection = (section: LayoutSection) => (
    <CanvasSection
      key={section.id}
      section={section}
      context={context}
      selection={selection}
      preview={preview}
      onSelect={onSelect}
    />
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3.5 pl-5 -ml-5">
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
