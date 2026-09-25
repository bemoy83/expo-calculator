'use client';

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
import { GripVertical, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  CalculatorLayoutItem,
  SectionHeading,
  isResultSection,
  isShown,
  itemSpan,
  type LayoutRenderContext,
} from '@/components/calculator/CalculatorLayoutItem';
import { findLayoutItem, layoutItemKey, type LayoutPosition } from '@/lib/calculator/editing';
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
        selected ? 'outline outline-2 outline-action' : 'outline outline-1 outline-transparent hover:outline-border-strong',
        isDragging && 'z-10 opacity-80 bg-surface shadow-panel'
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
        <p className="mb-1 text-[11px] text-action">
          Shown only when {describeCondition(context.inputsById.get(item.inputId)!.visibleWhen!, context.calculator, context.library)}
        </p>
      )}
      {missing ? (
        <p className="text-xs italic text-ink-faint">{describeItem(item, context)}</p>
      ) : hidden ? (
        <p className="text-xs italic text-ink-faint">{describeItem(item, context)} (hidden by its condition)</p>
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
    <Card
      className={cn(
        'p-4 sm:p-5',
        !preview && sectionSelected && 'outline outline-2 outline-action',
        !preview && isOver && 'outline outline-2 outline-dashed outline-action/60'
      )}
    >
      {!preview && (
        <button
          type="button"
          onClick={() => onSelect({ type: 'section', sectionId: section.id })}
          aria-pressed={sectionSelected}
          className={cn(
            '-mt-1 mb-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
            sectionSelected ? 'bg-action-solid text-on-accent' : 'bg-sunken text-ink-muted hover:text-ink'
          )}
        >
          Section{section.title ? ` · ${section.title}` : ''}
        </button>
      )}
      {!preview && section.visibleWhen && (
        <p className="-mt-1 mb-2 text-[11px] text-action">
          Shown only when {describeCondition(section.visibleWhen, context.calculator, context.library)}
          {!isShown(section.visibleWhen, context) && ' (hidden now)'}
        </p>
      )}
      <SectionHeading section={section} />
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={cn('grid grid-cols-1 sm:grid-cols-6 gap-x-4 gap-y-3', !preview && 'min-h-[48px]')}>
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
    </Card>
  );
}

// The page staff see, drawn live, with each item selectable and draggable within and between
// sections. In preview it is exactly the staff view.
export function LayoutCanvas({
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
  const main = visible.filter((section) => !isResultSection(section));
  const side = visible.filter(isResultSection);

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
      <div className={cn('grid gap-5', side.length > 0 && '2xl:grid-cols-[minmax(0,1fr)_320px] items-start')}>
        <div className="space-y-5 min-w-0 pl-5 -ml-5">
          {main.map(renderSection)}
          {!preview && (
            <button
              type="button"
              onClick={onAddSection}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong py-3 text-sm text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add section
            </button>
          )}
        </div>
        {side.length > 0 && <div className="space-y-5 pl-5 -ml-5 2xl:sticky 2xl:top-8">{side.map(renderSection)}</div>}
      </div>
    </DndContext>
  );
}
