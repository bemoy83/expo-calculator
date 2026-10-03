'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FunctionItem {
  /** What's inserted at the caret, or wrapped around the selection */
  value: string;
  name: string;
  /** The argument(s) after the first, shown after it */
  extra?: string;
  description: string;
  ariaLabel: string;
}

interface CompareItem {
  value: string;
  description: string;
  ariaLabel: string;
  title?: string;
}

// Operators are shown as typeset symbols but insert what the formula language reads.
const OPERATORS = [
  { label: '+', insert: '+', ariaLabel: 'Insert addition operator' },
  { label: '−', insert: '-', ariaLabel: 'Insert subtraction operator' },
  { label: '×', insert: '*', ariaLabel: 'Insert multiplication operator' },
  { label: '÷', insert: '/', ariaLabel: 'Insert division operator' },
  { label: '( )', insert: '()', ariaLabel: 'Insert brackets, or wrap the selection in brackets' },
];

const FUNCTIONS: FunctionItem[] = [
  { value: 'round()', name: 'round', description: 'nearest whole', ariaLabel: 'Insert round function' },
  { value: 'round(, )', name: 'round', extra: ', d', description: 'to d decimals', ariaLabel: 'Insert round function with decimals' },
  { value: 'ceil()', name: 'ceil', description: 'round up', ariaLabel: 'Insert ceil function' },
  { value: 'floor()', name: 'floor', description: 'round down', ariaLabel: 'Insert floor function' },
  { value: 'sqrt()', name: 'sqrt', description: 'square root', ariaLabel: 'Insert square root function' },
];

const YES_NO_TIP = 'Yes/no counts as 1 or 0, so price * (tax == 1) works as a condition.';

const COMPARE: CompareItem[] = [
  { value: '==', description: 'equals', ariaLabel: 'Insert equals operator', title: YES_NO_TIP },
  { value: '!=', description: 'not equals', ariaLabel: 'Insert not equals operator' },
  { value: '>', description: 'greater than', ariaLabel: 'Insert greater than operator' },
  { value: '<', description: 'less than', ariaLabel: 'Insert less than operator' },
  { value: '>=', description: 'greater or equal', ariaLabel: 'Insert greater or equal operator' },
  { value: '<=', description: 'less or equal', ariaLabel: 'Insert less or equal operator' },
];

/** Parameters wrap; past this many lines they're cut off until "Show all". */
const PARAMETER_LINES = 2;
const ITEM_HEIGHT = 32;

// How much of the selection a function's preview shows: 15 characters where the columns are
// wide (the spec's 860px pane), fewer where three of them have to share less room.
const previewOf = (text: string, length: number) => {
  const flat = text.trim().replace(/\s+/g, ' ');
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
};
const ROOMY_FROM = 760;

// The inserts for the formula, always open under it (mockup 4b). Every button swallows mousedown,
// so the formula keeps focus and its selection: a click wraps the selection or inserts at the
// caret. While part of the formula is selected, the rows say what each would do with it.
export function FormulaPalette({
  parameters,
  selectedText,
  narrow,
  onInsertParameter,
  onInsertOperator,
  onReturnToFormula,
}: {
  parameters: string[];
  /** The selected part of the formula, or '' */
  selectedText: string;
  /** The pane is narrow: no row labels, tighter grids */
  narrow: boolean;
  onInsertParameter: (name: string) => void;
  onInsertOperator: (operator: string) => void;
  /** Esc in the palette: back to the formula, with its selection or caret */
  onReturnToFormula: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [width, setWidth] = useState(0);
  const hasSelection = selectedText.trim() !== '';
  const preview = hasSelection ? previewOf(selectedText, width >= ROOMY_FROM ? 15 : 9) : '';
  const itemHeight = narrow ? 30 : ITEM_HEIGHT;

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Whether the parameters need more than their allowed lines.
  useLayoutEffect(() => {
    const el = parametersRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > PARAMETER_LINES * ITEM_HEIGHT + 4);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [parameters, narrow]);

  // Roving tab stop: Tab enters the palette once, arrows move between its buttons. Only ← → are
  // meant to be relied on: ↑ ↓ step through the same reading order rather than moving between rows,
  // so the footer lists ← → alone until row-to-row movement is built.
  useEffect(() => {
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[data-palette-item]');
    items?.forEach((item, index) => {
      item.tabIndex = index === Math.min(active, items.length - 1) ? 0 : -1;
    });
  });

  const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-palette-item]') ?? []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onReturnToFormula();
      return;
    }
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const all = items();
    const current = all.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (current + step + all.length) % all.length;
    all[next].focus();
  };

  const itemClass = cn(
    'inline-flex items-center rounded-md bg-transparent text-left transition-colors duration-150 outline-none cursor-pointer',
    'hover:bg-field focus-visible:bg-field focus-visible:[box-shadow:var(--focus-ring)]'
  );
  const itemStyle = { height: itemHeight };

  // The "what a click does" line over a row's label, only while something is selected.
  const context = (text: string) =>
    hasSelection && text ? (
      <span className="font-numeric text-[10px] font-semibold uppercase tracking-[.06em] text-accent">{text}</span>
    ) : null;

  const row = (label: string, contextText: string, children: React.ReactNode) => (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 items-center">
      <div className="flex flex-col justify-center leading-tight">
        {context(contextText)}
        <span className="text-xs text-ink-faint">{label}</span>
      </div>
      {children}
    </div>
  );

  const parameterButtons = parameters.map((name) => (
    <button
      key={name}
      type="button"
      data-palette-item
      aria-label={`Insert parameter ${name}`}
      onClick={() => onInsertParameter(name)}
      className={cn(itemClass, 'flex-none px-[9px] font-numeric text-token-input', narrow ? 'text-sm' : 'text-[15px]')}
      style={itemStyle}
    >
      {name}
    </button>
  ));

  const parameterList =
    parameters.length === 0 ? (
      <span className="text-xs text-ink-faint">Add parameters to insert them here.</span>
    ) : (
      <div className="min-w-0">
        <div
          ref={parametersRef}
          className="flex flex-wrap gap-0.5 items-center overflow-hidden"
          style={showAll ? undefined : { maxHeight: PARAMETER_LINES * itemHeight + 2 }}
        >
          {parameterButtons}
          {narrow && context('Replace with')}
        </div>
        {(overflowing || showAll) && (
          <button
            type="button"
            data-palette-item
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
            className="mt-0.5 px-[9px] h-6 rounded-md text-xs text-ink-muted hover:text-ink hover:bg-field focus-visible:bg-field focus-visible:[box-shadow:var(--focus-ring)] outline-none"
          >
            {showAll ? 'Show fewer' : 'Show all'}
          </button>
        )}
      </div>
    );

  const operatorButtons = (
    <div className={cn('flex gap-0.5', narrow ? 'w-full' : 'flex-wrap')}>
      {OPERATORS.map((operator) => (
        <button
          key={operator.insert}
          type="button"
          data-palette-item
          aria-label={operator.ariaLabel}
          onClick={() => onInsertOperator(operator.insert)}
          className={cn(itemClass, 'justify-center font-numeric text-[17px] text-ink', narrow ? 'flex-1' : 'w-[34px]')}
          style={itemStyle}
        >
          {operator.label}
        </button>
      ))}
    </div>
  );

  const functionArgument = (item: FunctionItem) => (
    <>
      {hasSelection ? (
        <span className="rounded-sm bg-accent-soft px-0.5 text-ink">{preview}</span>
      ) : (
        <span className="text-ink-muted">x</span>
      )}
      {item.extra && <span className="text-ink-muted">{item.extra}</span>}
    </>
  );

  const functionButtons = FUNCTIONS.map((item) => (
    <button
      key={item.value}
      type="button"
      data-palette-item
      aria-label={item.ariaLabel}
      onClick={() => onInsertOperator(item.value)}
      className={cn(itemClass, 'min-w-0 overflow-hidden gap-2.5 px-2 items-baseline')}
      style={itemStyle}
    >
      <span className="flex-none whitespace-nowrap font-numeric text-sm self-center">
        <span className="text-token-function">{item.name}</span>
        <span className="text-ink-faint">(</span>
        {functionArgument(item)}
        <span className="text-ink-faint">)</span>
      </span>
      <span className="min-w-0 truncate text-[11.5px] text-ink-faint self-center">{item.description}</span>
    </button>
  ));

  const compareButtons = COMPARE.map((item) => (
    <button
      key={item.value}
      type="button"
      data-palette-item
      aria-label={item.ariaLabel}
      title={item.title}
      onClick={() => onInsertOperator(item.value)}
      className={cn(itemClass, 'gap-1.5 px-2 whitespace-nowrap')}
      style={itemStyle}
    >
      <span className="font-numeric text-[15px] text-ink">{item.value}</span>
      <span className="text-[11.5px] text-ink-faint">{item.description}</span>
    </button>
  ));

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Insert into formula"
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onFocusCapture={(e) => {
        const index = items().indexOf(e.target as HTMLElement);
        if (index !== -1) setActive(index);
      }}
      className="flex flex-col gap-0.5 rounded-xl border border-border-strong bg-surface px-3 py-2.5"
    >
      {narrow ? (
        <>
          {parameterList}
          {operatorButtons}
          <div>
            {context('Wrap in')}
            <div className="grid grid-cols-2 gap-x-2">{functionButtons}</div>
          </div>
          <div>
            {context('Wrap as ( … ? )')}
            <div className="grid grid-cols-3">{compareButtons}</div>
          </div>
        </>
      ) : (
        <>
          {row('Parameters', 'Replace with', parameterList)}
          {row('Operators', '', operatorButtons)}
          {row('Functions', 'Wrap in', <div className="grid grid-cols-3 gap-x-2">{functionButtons}</div>)}
          {row('Compare', 'Wrap as ( … ? )', <div className="flex flex-wrap gap-1">{compareButtons}</div>)}
        </>
      )}
      <div className="-mx-3 -mb-2.5 mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-b-xl border-t border-border bg-panel px-3 py-2 text-[11.5px] text-ink-faint">
        <p>
          Yes/no counts as 1 or 0, so <code className="font-numeric text-ink-muted">price * (tax == 1)</code> works as a condition.
        </p>
        {!narrow && <p className="font-numeric">← → move · ↵ insert · esc back to formula</p>}
      </div>
    </div>
  );
}
