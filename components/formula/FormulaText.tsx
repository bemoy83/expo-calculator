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

const WAVY_UNDERLINE = 'underline decoration-wavy underline-offset-[5px]';
// A name nothing matches yet is "unresolved", not wrong: amber and dotted, where a syntax error is red and wavy.
const UNRESOLVED = 'text-draft underline decoration-dotted decoration-draft underline-offset-[5px]';

// A formula with its names coloured by kind: inputs, results of other steps, functions,
// material/labor properties, and names nothing matches. Hovering a name says what it is.
export function FormulaText({
  expression,
  names,
  className,
  block = false,
  markUnresolved = false,
  errorRange,
}: {
  expression: string;
  names: FormulaNames;
  className?: string;
  /** A block of its own that keeps the formula's line breaks */
  block?: boolean;
  /** Draw names nothing matches as unresolved (amber, dotted) instead of the plain red dotted */
  markUnresolved?: boolean;
  /** Part of the text to underline as a syntax error, [start, end) */
  errorRange?: { start: number; end: number } | null;
}) {
  // Each coloured piece is cut at the error's edges, so the broken part gets its underline and
  // every piece keeps its colour.
  let offset = 0;
  const pieces = classifyFormula(expression, names).flatMap((segment, index) => {
    const from = offset;
    offset += segment.text.length;
    const cuts = errorRange ? [errorRange.start - from, errorRange.end - from].filter((cut) => cut > 0 && cut < segment.text.length) : [];
    const bounds = [0, ...cuts, segment.text.length];
    return bounds.slice(0, -1).map((cut, part) => {
      const text = segment.text.slice(cut, bounds[part + 1]);
      const broken = Boolean(errorRange) && from + cut >= errorRange!.start && from + cut + text.length <= errorRange!.end;
      return { key: `${index}-${part}`, text, kind: segment.kind, broken };
    });
  });
  return (
    <code className={cn('font-numeric', block && 'block whitespace-pre-wrap', className)}>
      {pieces.map((piece) => {
        const colour =
          piece.kind === 'plain' ? undefined : markUnresolved && piece.kind === 'unknown' ? UNRESOLVED : TOKEN_TEXT[piece.kind];
        return (
          <span
            key={piece.key}
            className={cn(colour, piece.broken && `${WAVY_UNDERLINE} decoration-danger`)}
            title={piece.kind === 'plain' ? undefined : TOKEN_TITLE[piece.kind]}
          >
            {piece.text}
          </span>
        );
      })}
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
