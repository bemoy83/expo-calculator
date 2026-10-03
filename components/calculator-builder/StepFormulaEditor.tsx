'use client';

import { useMemo, useRef } from 'react';
import { FormulaEditor, type FormulaEditorHandle } from '@/components/formula/FormulaEditorLazy';
import { TidyOffer } from '@/components/formula/TidyOffer';
import { FIELD_ERROR, FIELD_LABEL } from '@/components/ui/field-styles';
import { useTidyOffer } from '@/hooks/use-tidy-offer';
import type { AutocompleteSuggestion } from '@/lib/formula/suggestions';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepResult } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { calculatorFormulaNames } from '@/lib/calculator/formula-tokens';
import { describeStepProblem, formatStepValue } from '@/lib/calculator/format';
import { callSignature, propertyNamesFor } from '@/lib/calculator/call-context';

const MATH_FUNCTIONS = [
  { name: 'ceil', description: 'Round up' },
  { name: 'floor', description: 'Round down' },
  { name: 'round', description: 'Round; round(x, 2) to 2 decimals' },
  { name: 'min', description: 'Smallest value' },
  { name: 'max', description: 'Largest value' },
  { name: 'abs', description: 'Absolute value' },
  { name: 'sqrt', description: 'Square root' },
];

// Names a step's formula can use: inputs, other steps, properties of picked materials/labor,
// functions, and constants.
function useCandidates(calculator: Calculator, step: CalculatorStep, library: CalculatorLibrary): AutocompleteSuggestion[] {
  return useMemo(() => {
    const candidates: AutocompleteSuggestion[] = [];
    for (const input of calculator.inputs) {
      if (input.value.kind === 'text') continue;
      candidates.push({ name: input.key, displayName: input.key, type: 'field', description: input.label });
      if (input.value.kind === 'material' || input.value.kind === 'labor') {
        const properties = propertyNamesFor(input, library);
        properties.forEach((property) =>
          candidates.push({
            name: `${input.key}.${property}`,
            displayName: `${input.key}.${property}`,
            type: input.value.kind === 'material' ? 'property' : 'laborProperty',
            description: `${property} of the chosen ${input.value.kind === 'material' ? 'material' : 'labor'}`,
          })
        );
      }
    }
    for (const other of calculator.steps) {
      if (other.id === step.id) continue;
      candidates.push({ name: other.key, displayName: other.key, type: 'field', description: other.label });
    }
    for (const fn of library.functions) {
      const params = fn.parameters.map((param) => param.name).join(', ');
      candidates.push({
        name: fn.name,
        displayName: `${fn.name}(${params})`,
        type: 'function',
        description: fn.description || fn.displayName,
        functionSignature: params,
      });
    }
    for (const fn of MATH_FUNCTIONS) {
      candidates.push({ name: fn.name, displayName: `${fn.name}()`, type: 'function', description: fn.description });
    }
    candidates.push({ name: 'pi', displayName: 'pi', type: 'constant', description: 'π' });
    return candidates;
  }, [calculator.inputs, calculator.steps, step.id, library]);
}

// A step's formula, in the boxed field the builder's other inputs use, with the same editor as a
// function's formula: names coloured by what they are, suggestions as you type (arrows and Enter
// or Tab), and a tidy-up offered once it has rested.
export function StepFormulaEditor({
  label,
  calculator,
  step,
  library,
  value,
  error,
  errorRange,
  results,
  formatMoney,
  onChange,
}: {
  id?: string;
  label?: string;
  calculator: Calculator;
  step: CalculatorStep;
  library: CalculatorLibrary;
  value: string;
  error?: string;
  /** Where the formula's syntax breaks, to underline it */
  errorRange?: { start: number; end: number } | null;
  /** Each step's current result, to say what a step's name is worth on hover */
  results?: Record<string, StepResult>;
  formatMoney?: (amount: number) => string;
  onChange: (value: string) => void;
}) {
  const editor = useRef<FormulaEditorHandle | null>(null);
  const formulaNames = useMemo(() => calculatorFormulaNames(calculator, library), [calculator, library]);
  const candidates = useCandidates(calculator, step, library);
  const stepKeys = useMemo(() => new Set(calculator.steps.map((other) => other.key)), [calculator.steps]);
  const describeValue = (name: string) => {
    const other = calculator.steps.find((candidate) => candidate.key === name);
    const result = other && results?.[other.id];
    if (!other || !result) return undefined;
    if (result.status === 'disabled') return 'off (0)';
    const problem = describeStepProblem(result, calculator);
    if (problem) return problem.charAt(0).toLowerCase() + problem.slice(1);
    if (result.displayValue === undefined) return undefined;
    const { text, unit } = formatStepValue(other, result.displayValue, formatMoney ?? String);
    return unit ? `${text} ${unit}` : text;
  };
  const tidy = useTidyOffer({ formula: value, apply: (tidied) => editor.current?.applyTidy(tidied) });

  return (
    <div>
      {label && <span className={FIELD_LABEL}>{label}</span>}
      <div
        onMouseDown={(event) => {
          // The box is the field: a click below the text puts the caret at the end.
          if ((event.target as HTMLElement).closest('.cm-editor')) return;
          event.preventDefault();
          editor.current?.setSelection(value.length, value.length);
          editor.current?.focus();
        }}
        className={cn(
          'min-h-[62px] w-full cursor-text rounded-md border border-transparent bg-field px-3 py-2.5',
          'transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
          'hover:bg-field-hover focus-within:bg-field-hover',
          error
            ? '[box-shadow:var(--field-error)] focus-within:[box-shadow:var(--field-error-focus)]'
            : 'focus-within:[box-shadow:var(--field-focus)]'
        )}
      >
        <FormulaEditor
          value={value}
          onChange={onChange}
          names={formulaNames}
          errorRange={errorRange}
          fontSize={13}
          lineHeight={1.625}
          placeholderText="e.g. area_rectangle(width, height)"
          ariaLabel={label ?? 'Formula'}
          invalid={!!error}
          candidates={candidates}
          isStepKey={(name) => stepKeys.has(name)}
          describeValue={describeValue}
          signatureFor={(name) => callSignature(name, library)}
          tidyOnBlur
          handleRef={editor}
        />
      </div>
      {error && (
        <p className={FIELD_ERROR} role="alert">
          {error}
        </p>
      )}
      {tidy.show && (
        <div className="mt-1">
          <TidyOffer tidied={tidy.tidied} onApply={tidy.apply} />
        </div>
      )}
    </div>
  );
}
