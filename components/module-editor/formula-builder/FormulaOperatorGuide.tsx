'use client';

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
      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
      aria-label={operator.ariaLabel}
    >
      <code className="text-md-primary font-mono font-semibold">{operator.label}</code>{' '}
      <span className="text-md-on-surface-variant ml-1">{operator.description}</span>
    </button>
  );
}

export function FormulaOperatorGuide({ onInsertOperator }: FormulaOperatorGuideProps) {
  return (
    <div className="pt-4 border-t border-border">
      <h4 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
        Supported Operators
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {supportedOperators.map((operator) => (
          <OperatorButton
            key={operator.value}
            operator={operator}
            onInsertOperator={onInsertOperator}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <h5 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
          Comparison Operators
        </h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {comparisonOperators.map((operator) => (
            <OperatorButton
              key={operator.value}
              operator={operator}
              onInsertOperator={onInsertOperator}
            />
          ))}
        </div>
        <p className="text-xs text-md-on-surface-variant mt-3 px-2">
          <strong>Note:</strong> Boolean fields convert to 1 (true) or 0 (false). Use comparisons for conditional logic, e.g., <code className="text-md-primary">base_price * (include_tax == 1)</code>
        </p>
      </div>
    </div>
  );
}
