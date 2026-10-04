'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { ARRANGE_GAP, CalculatorForm } from '@/components/calculator/CalculatorForm';
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
// The run page is scaled to the room the canvas has: at most its real size, and no smaller than
// this. Below it the page is drawn as it stacks on a narrow screen, at full size.
const RUN_MIN_ZOOM = 0.5;
const FRAME_BORDER = 2;

// The width of an element, kept up to date as the window or the panes around it change.
function useElementWidth<T extends HTMLElement>(): [React.RefObject<T>, number | undefined] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const noop = () => {};

// The quote builder's line editor (2a), with the calculator's form drawn editable. Clicking the
// header deselects, which brings back the Calculator panel (and its colour).
function QuoteLineSurface({ context, name, onDeselect }: { context: LayoutRenderContext; name: string; onDeselect: () => void }) {
  const { calculator, result, formatMoney } = context;
  const color = lineColorVar(calculator.color);
  // The header's actions are drawn but inert.
  const actions = useMemo(() => lineActions(name), [name]);
  return (
    <div className="bg-canvas text-ink">
      {/* Choosing the header selects the calculator itself, which outlines the whole card. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select ${name}`}
        onClick={onDeselect}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onDeselect();
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
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

// The run page (4a): the form beside the live pane, scaled by `zoom`; or, `stacked`, the form
// above the live pane at full size, as the page falls back on a narrow screen. Select only.
function RunPageSurface({ context, name, zoom, stacked }: { context: LayoutRenderContext; name: string; zoom: number; stacked: boolean }) {
  if (stacked) {
    return (
      <div className="bg-canvas text-ink">
        <div className="px-4 py-[26px]">
          <h2 className="mb-[26px] text-[30px] font-bold tracking-[-.025em]">{name}</h2>
          <CalculatorForm context={context} results="pane" className="gap-[26px]" />
        </div>
        <div className="border-t border-border bg-panel px-6 py-5">
          <CalculatorLivePane context={context} onSend={noop} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: RUN_WIDTH * zoom }} className="overflow-hidden">
      {/* `zoom` shrinks the layout itself, so the frame takes the room it shows. */}
      <div style={{ width: RUN_WIDTH, zoom }} className="grid grid-cols-[minmax(0,1fr)_400px] bg-canvas text-ink">
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
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const runFit = ((containerWidth ?? RUN_WIDTH) - FRAME_BORDER) / RUN_WIDTH;
  const runStacked = runFit < RUN_MIN_ZOOM;
  const runZoom = Math.min(1, runFit);
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
  if (surface === 'run') body = <RunPageSurface context={surfaceContext} name={displayName} zoom={runZoom} stacked={runStacked} />;
  else if (surface === 'quick') body = <QuickViewSurface context={surfaceContext} name={displayName} />;
  else body = <QuoteLineSurface context={surfaceContext} name={displayName} onDeselect={() => onSelect(null)} />;
  // The stacked run page takes the canvas's width.
  // Quote line is wider while arranging by the handles' room, so its fields keep their real widths:
  // two gaps' worth in the widest row (three thirds).
  const width =
    surface === 'run' ? (runStacked ? undefined : RUN_WIDTH * runZoom + FRAME_BORDER) : surface === 'quick' ? 420 : 660 + 2 * ARRANGE_GAP;

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setOverSectionId(null)}>
      <div ref={containerRef}>
        <div style={{ width }} className="mx-auto max-w-full">
          {/* With nothing selected the calculator is what the inspector shows, so the card is outlined. */}
          <div
            className={cn(
              'overflow-hidden rounded-lg border border-border-strong',
              !selection && 'outline outline-[1.5px] outline-offset-8 outline-accent'
            )}
          >
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
