'use client';

import { classifyFormula, type FormulaNames, type FormulaTokenKind } from '@/lib/calculator/formula-tokens';
import { cn } from '@/lib/utils';

/** Text colour for each kind of name; plain text keeps the surrounding colour. */
export const TOKEN_TEXT: Record<FormulaTokenKind, string> = {
  input: 'text-token-input',
  result: 'text-token-result',
  function: 'text-token-function',
  property: 'text-token-property',
  unknown: 'text-danger underline decoration-dotted underline-offset-2',
  plain: '',
};

const TOKEN_TITLE: Record<FormulaTokenKind, string | undefined> = {
  input: 'Input',
  result: 'Result of a step',
  function: 'Function',
  property: 'Material or labor property',
  unknown: 'Unknown name',
  plain: undefined,
};

// A formula with its names coloured by kind: inputs, results of other steps, functions,
// material/labor properties, and names nothing matches. Hovering a name says what it is.
export function FormulaText({
  expression,
  names,
  className,
  block = false,
}: {
  expression: string;
  names: FormulaNames;
  className?: string;
  /** A block of its own that keeps the formula's line breaks */
  block?: boolean;
}) {
  return (
    <code className={cn('font-numeric', block && 'block whitespace-pre-wrap', className)}>
      {classifyFormula(expression, names).map((segment, index) =>
        segment.kind === 'plain' ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <span key={index} className={TOKEN_TEXT[segment.kind]} title={TOKEN_TITLE[segment.kind]}>
            {segment.text}
          </span>
        )
      )}
    </code>
  );
}

const LEGEND: Array<{ kind: FormulaTokenKind; label: string }> = [
  { kind: 'input', label: 'input' },
  { kind: 'result', label: 'result of a step' },
  { kind: 'function', label: 'function' },
  { kind: 'property', label: 'material property' },
];

/** The colour key, for where formulas are first met. */
export function FormulaLegend({ className, inputLabel = 'input' }: { className?: string; inputLabel?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted', className)}>
      <span>Colours in formulas:</span>
      {LEGEND.map((entry) => (
        <span key={entry.kind} className={cn('font-numeric font-medium', TOKEN_TEXT[entry.kind])}>
          {entry.kind === 'input' ? inputLabel : entry.label}
        </span>
      ))}
    </p>
  );
}

type SuggestionType = 'field' | 'material' | 'property' | 'function' | 'constant' | 'labor' | 'laborProperty';

/** An autocomplete suggestion's kind and tag, matching the formula colours. */
export function suggestionToken(type: SuggestionType, isStep = false): { kind: FormulaTokenKind; label: string } {
  switch (type) {
    case 'field':
      return isStep ? { kind: 'result', label: 'result' } : { kind: 'input', label: 'input' };
    case 'function':
      return { kind: 'function', label: 'function' };
    case 'material':
      return { kind: 'property', label: 'material' };
    case 'labor':
      return { kind: 'property', label: 'labor' };
    case 'property':
    case 'laborProperty':
      return { kind: 'property', label: 'property' };
    case 'constant':
      return { kind: 'plain', label: 'constant' };
  }
}
