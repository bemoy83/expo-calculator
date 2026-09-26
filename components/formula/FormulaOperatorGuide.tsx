'use client';

import { ChevronRight } from 'lucide-react';

interface FormulaOperatorGuideProps {
  onInsertOperator: (operator: string) => void;
}

const supportedOperators = [
  { value: '+', label: '+', description: 'Add', ariaLabel: 'Insert addition operator' },
  { value: '-', label: '-', description: 'Subtract', ariaLabel: 'Insert subtraction operator' },
  { value: '*', label: '*', description: 'Multiply', ariaLabel: 'Insert multiplication operator' },
  { value: '/', label: '/', description: 'Divide', ariaLabel: 'Insert division operator' },
  { value: '()', label: '()', description: 'Grouping', ariaLabel: 'Insert parentheses' },
  { value: 'sqrt()', label: 'sqrt()', description: 'Square root', ariaLabel: 'Insert square root function' },
  { value: 'round()', label: 'round(x)', description: 'Round to nearest integer', ariaLabel: 'Insert round function' },
  { value: 'round(, )', label: 'round(x, decimals)', description: 'Round to fixed decimals', ariaLabel: 'Insert round function with decimals' },
  { value: 'ceil()', label: 'ceil(x)', description: 'Round up to next integer', ariaLabel: 'Insert ceil function' },
  { value: 'floor()', label: 'floor(x)', description: 'Round down to previous integer', ariaLabel: 'Insert floor function' },
];

const comparisonOperators = [
  { value: '==', label: '==', description: 'Equals', ariaLabel: 'Insert equals operator' },
  { value: '!=', label: '!=', description: 'Not equals', ariaLabel: 'Insert not equals operator' },
  { value: '>', label: '>', description: 'Greater than', ariaLabel: 'Insert greater than operator' },
  { value: '<', label: '<', description: 'Less than', ariaLabel: 'Insert less than operator' },
  { value: '>=', label: '>=', description: 'Greater or equal', ariaLabel: 'Insert greater or equal operator' },
  { value: '<=', label: '<=', description: 'Less or equal', ariaLabel: 'Insert less or equal operator' },
];

function OperatorButton({
  operator,
  onInsertOperator,
}: {
  operator: { value: string; label: string; description: string; ariaLabel: string };
  onInsertOperator: (operator: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsertOperator(operator.value)}
      className="px-1.5 py-0.5 rounded text-left hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      aria-label={operator.ariaLabel}
    >
      <code className="text-ink font-numeric font-semibold">{operator.label}</code>{' '}
      <span className="text-ink-muted ml-1">{operator.description}</span>
    </button>
  );
}

export function FormulaOperatorGuide({ onInsertOperator }: FormulaOperatorGuideProps) {
  return (
    // Reference material: collapsed by default so the panel stays about the formula.
    <details className="group pt-3 border-t border-border">
      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted hover:text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        Operators &amp; functions
      </summary>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2.5">
        {supportedOperators.map((operator) => (
          <OperatorButton
            key={operator.value}
            operator={operator}
            onInsertOperator={onInsertOperator}
          />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <h5 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-1.5">
          Comparisons
        </h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {comparisonOperators.map((operator) => (
            <OperatorButton
              key={operator.value}
              operator={operator}
              onInsertOperator={onInsertOperator}
            />
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-2.5 px-1.5">
          Boolean fields count as 1 (true) or 0 (false). Use comparisons for conditional logic, e.g.{' '}
          <code className="font-numeric text-ink">base_price * (include_tax == 1)</code>
        </p>
      </div>
    </details>
  );
}
