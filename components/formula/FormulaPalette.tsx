'use client';

import { cn } from '@/lib/utils';

interface PaletteItem {
  /** What's inserted at the caret */
  value: string;
  label: string;
  description: string;
  ariaLabel: string;
}

// What the formula language offers here. The same items the old "Operators & functions" guide
// listed; the redesign changes only how they're laid out.
const OPERATORS: PaletteItem[] = [
  { value: '+', label: '+', description: 'Add', ariaLabel: 'Insert addition operator' },
  { value: '-', label: '-', description: 'Subtract', ariaLabel: 'Insert subtraction operator' },
  { value: '*', label: '*', description: 'Multiply', ariaLabel: 'Insert multiplication operator' },
  { value: '/', label: '/', description: 'Divide', ariaLabel: 'Insert division operator' },
  { value: '()', label: '()', description: 'Grouping', ariaLabel: 'Insert parentheses' },
];

const GROUPS: Array<{ title: string; items: PaletteItem[] }> = [
  {
    title: 'Rounding',
    items: [
      { value: 'round()', label: 'round(x)', description: 'nearest whole', ariaLabel: 'Insert round function' },
      { value: 'round(, )', label: 'round(x, decimals)', description: 'fixed decimals', ariaLabel: 'Insert round function with decimals' },
      { value: 'ceil()', label: 'ceil(x)', description: 'round up', ariaLabel: 'Insert ceil function' },
      { value: 'floor()', label: 'floor(x)', description: 'round down', ariaLabel: 'Insert floor function' },
    ],
  },
  {
    title: 'Math',
    items: [{ value: 'sqrt()', label: 'sqrt(x)', description: 'square root', ariaLabel: 'Insert square root function' }],
  },
  {
    title: 'Compare',
    items: [
      { value: '==', label: '==', description: 'equals', ariaLabel: 'Insert equals operator' },
      { value: '!=', label: '!=', description: 'not equals', ariaLabel: 'Insert not equals operator' },
      { value: '>', label: '>', description: 'greater than', ariaLabel: 'Insert greater than operator' },
      { value: '<', label: '<', description: 'less than', ariaLabel: 'Insert less than operator' },
      { value: '>=', label: '>=', description: 'greater or equal', ariaLabel: 'Insert greater or equal operator' },
      { value: '<=', label: '<=', description: 'less or equal', ariaLabel: 'Insert less or equal operator' },
    ],
  },
];

const insertButton = 'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action';

// The quick-insert palette under the formula (mockup 2a), always open: the function's own
// parameters, the operators, then functions and comparisons by group. Clicking inserts at the caret.
export function FormulaPalette({
  parameters,
  onInsertParameter,
  onInsertOperator,
}: {
  parameters: string[];
  onInsertParameter: (name: string) => void;
  onInsertOperator: (operator: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 rounded-lg border border-border bg-surface">
      <div className="flex gap-3.5 items-center">
        <span className="w-[76px] flex-none text-xs text-ink-muted">Parameters</span>
        {parameters.length === 0 ? (
          <span className="text-xs text-ink-faint">Add parameters to insert them here.</span>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {parameters.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onInsertParameter(name)}
                aria-label={`Insert parameter ${name}`}
                className={cn(
                  insertButton,
                  'h-[26px] px-2.5 rounded-full bg-sunken font-numeric text-[13px] text-token-input hover:bg-sunken-2'
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3.5 items-center">
        <span className="w-[76px] flex-none text-xs text-ink-muted">Operators</span>
        <div className="flex gap-1.5 flex-wrap">
          {OPERATORS.map((operator) => (
            <button
              key={operator.value}
              type="button"
              onClick={() => onInsertOperator(operator.value)}
              aria-label={operator.ariaLabel}
              title={operator.description}
              className={cn(
                insertButton,
                'min-w-8 h-[30px] px-1.5 rounded-sm font-numeric text-sm text-ink hover:bg-surface-hover'
              )}
            >
              {operator.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
        {GROUPS.map((group) => (
          <div
            key={group.title}
            className={cn('grid gap-x-3 gap-y-[5px] min-w-0 content-start', group.title === 'Compare' ? 'grid-cols-2' : 'grid-cols-1')}
          >
            <div className="col-span-full mb-0.5 font-numeric text-[11px] uppercase tracking-[.06em] text-ink-faint">{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onInsertOperator(item.value)}
                aria-label={item.ariaLabel}
                className={cn(insertButton, 'flex flex-col items-start text-left hover:bg-surface-hover -mx-1 px-1')}
              >
                <span
                  className={cn(
                    'font-numeric text-[13px] break-words max-w-full',
                    group.title === 'Compare' ? 'text-ink' : 'text-token-function'
                  )}
                >
                  {item.label}
                </span>
                <span className="text-[11px] text-ink-faint">{item.description}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-faint">
        Yes/no values count as 1 or 0, so comparisons work as conditions, e.g.{' '}
        <code className="font-numeric text-ink-muted">base_price * (include_tax == 1)</code>
      </p>
    </div>
  );
}
