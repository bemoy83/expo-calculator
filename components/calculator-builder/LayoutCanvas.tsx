'use client';

import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CalculatorForm } from '@/components/calculator/CalculatorForm';
import { CalculatorLivePane } from '@/components/calculator/CalculatorLivePane';
import type { LayoutRenderContext } from '@/components/calculator/CalculatorLayoutItem';
import { SECTION_DROP, type LayoutSelection } from '@/components/calculator/LayoutEditing';
import { LineHeader, LineTotal, lineActions } from '@/components/quotes/LineEditorParts';
import { findLayoutItem, type LayoutPosition } from '@/lib/calculator/editing';
import { lineColorVar } from '@/lib/calculator/line-color';
import { cn } from '@/lib/utils';
import type { Surface } from './layout-surface';

export type { LayoutSelection };

const RUN_WIDTH = 1040;
const RUN_ZOOM = 0.64;

const noop = () => {};

// The quote builder's line editor (2a), with the calculator's form drawn editable. Clicking the
// header deselects, which brings back the Calculator panel (and its colour).
function QuoteLineSurface({ context, name, selection, onDeselect }: { context: LayoutRenderContext; name: string; selection: LayoutSelection; onDeselect: () => void }) {
  const { calculator, result, formatMoney } = context;
  const color = lineColorVar(calculator.color);
  // The header's actions are drawn but inert.
  const actions = useMemo(() => lineActions(name), [name]);
  return (
    <div className="bg-canvas text-ink">
      <div
        onClick={onDeselect}
        className={cn(
          'cursor-pointer',
          !selection && 'outline outline-[1.5px] -outline-offset-[6px] outline-dashed',
          !selection && (color ? 'outline-[var(--on-line)]' : 'outline-accent')
        )}
      >
        <LineHeader
          color={color}
          nickname=""
          placeholder={name}
          calculatorName={name}
          actions={actions}
          preview
        />
      </div>
      <div className="flex flex-col gap-[22px] px-8 pb-6 pt-6">
        <CalculatorForm context={context} />
        <LineTotal
          color={color}
          value={result.quoteCost !== undefined ? formatMoney(result.quoteCost) : '—'}
          unfinished={result.quoteCost === undefined ? 'Not calculated yet' : undefined}
        />
      </div>
    </div>
  );
}

// The run page (4a) at 64%: the form beside the live pane. Select only.
function RunPageSurface({ context, name }: { context: LayoutRenderContext; name: string }) {
  return (
    <div style={{ width: RUN_WIDTH * RUN_ZOOM }} className="overflow-hidden">
      {/* `zoom` shrinks the layout itself, so the frame takes the room it shows. */}
      <div style={{ width: RUN_WIDTH, zoom: RUN_ZOOM }} className="grid grid-cols-[minmax(0,1fr)_400px] bg-canvas text-ink">
        <div className="min-w-0 px-8 py-[26px]">
          <h2 className="mb-[26px] text-[30px] font-bold tracking-[-.025em]">{name}</h2>
          <CalculatorForm context={context} results="pane" className="max-w-[760px] gap-[26px]" />
        </div>
        <div className="border-l border-border bg-panel px-6 py-5">
          <CalculatorLivePane context={context} onSend={noop} />
        </div>
      </div>
    </div>
  );
}

// The quick view (6b): phone width, thirds widened to halves, the results pinned under the form.
function QuickViewSurface({ context, name }: { context: LayoutRenderContext; name: string }) {
  return (
    <div className="flex w-[420px] flex-col bg-canvas text-ink">
      <div className="flex flex-col gap-4 px-[22px] py-[18px]">
        <h2 className="text-[22px] font-bold tracking-[-.02em]">{name}</h2>
        <CalculatorForm context={context} results="pane" className="gap-4" />
      </div>
      <CalculatorLivePane context={context} onSend={noop} layout="compact" />
    </div>
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

const FIELD_SIZE = { quote: undefined, run: 'large', quick: 'compact' } as const;

// The calculator's form drawn live in a preview frame (mockup 1b): the real CalculatorForm in
// edit mode, on the surface chosen in the inspector. You arrange in Quote line; Run page and
// Quick view are the same layout reflowed, and select only.
// Memoized on the data props only: `onSelect`/`onMove`/`onAddSection` are fresh closures every
// CalculatorBuilder render, but behaviorally stable whenever `context`/`selection`
// haven't changed — so it's safe to bail without comparing them.
export const LayoutCanvas = memo(function LayoutCanvas({
  context,
  name,
  surface,
  selection,
  onSelect,
  onMove,
  onAddSection,
}: {
  context: LayoutRenderContext;
  /** The calculator's name as typed in the header */
  name: string;
  /** What the form is drawn as; chosen in the inspector */
  surface: Surface;
  selection: LayoutSelection;
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
  const displayName = name || 'Untitled calculator';

  // Esc deselects, which opens the Calculator panel.
  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
      onSelect(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, onSelect]);

  const surfaceContext = useMemo(
    (): LayoutRenderContext => ({
      ...context,
      fieldSize: FIELD_SIZE[surface],
      editing: { selection, onSelect, arrange: surface === 'quote', overSectionId },
    }),
    [context, surface, selection, onSelect, overSectionId]
  );

  const handleDragOver = ({ over }: DragOverEvent) => {
    const overId = over ? String(over.id) : null;
    setOverSectionId(
      !overId ? null : overId.startsWith(SECTION_DROP) ? overId.slice(SECTION_DROP.length) : (findLayoutItem(calculator, overId)?.sectionId ?? null)
    );
  };

  // After dnd-kit has cleared its transforms, so the item doesn't jump back for a frame first.
  const commitMove = (from: LayoutPosition, to: LayoutPosition) => requestAnimationFrame(() => onMove(from, to));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setOverSectionId(null);
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

  let body: ReactNode;
  if (surface === 'run') body = <RunPageSurface context={surfaceContext} name={displayName} />;
  else if (surface === 'quick') body = <QuickViewSurface context={surfaceContext} name={displayName} />;
  else body = <QuoteLineSurface context={surfaceContext} name={displayName} selection={selection} onDeselect={() => onSelect(null)} />;
  const width = surface === 'run' ? RUN_WIDTH * RUN_ZOOM : surface === 'quick' ? 420 : 660;

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setOverSectionId(null)}>
      <div style={{ width }} className="mx-auto max-w-full">
        <div className="overflow-hidden rounded-lg border border-border-strong">
          {body}
        </div>
        <button
          type="button"
          onClick={onAddSection}
          className="mt-4 w-full rounded-lg border border-dashed border-border-strong p-3 text-center text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          + Add section
        </button>
      </div>
    </DndContext>
  );
},
(prev, next) =>
  prev.name === next.name &&
  prev.surface === next.surface &&
  prev.context.calculator === next.context.calculator &&
  prev.context.values === next.context.values &&
  prev.context.result === next.context.result &&
  prev.context.library === next.context.library &&
  prev.context.formatMoney === next.context.formatMoney &&
  prev.context.required === next.context.required &&
  prev.selection === next.selection
);
