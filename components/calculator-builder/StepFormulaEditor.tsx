'use client';

import { useMemo, useRef } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { useFormulaAutocomplete, type AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';
import type { Calculator, CalculatorLibrary, CalculatorStep } from '@/lib/calculator/types';
import { cn } from '@/lib/utils';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';

const MATH_FUNCTIONS = [
  { name: 'ceil', description: 'Round up' },
  { name: 'floor', description: 'Round down' },
  { name: 'round', description: 'Round; round(x, 2) to 2 decimals' },
  { name: 'min', description: 'Smallest value' },
  { name: 'max', description: 'Largest value' },
  { name: 'abs', description: 'Absolute value' },
  { name: 'sqrt', description: 'Square root' },
];

const TYPE_LABEL: Record<AutocompleteSuggestion['type'], string> = {
  field: 'input',
  material: 'material',
  property: 'property',
  function: 'function',
  constant: 'constant',
  labor: 'labor',
  laborProperty: 'property',
};

// Names a step's formula can use: inputs, other steps, properties of picked materials/labor,
// functions, and constants.
function useCandidates(calculator: Calculator, step: CalculatorStep, library: CalculatorLibrary): AutocompleteSuggestion[] {
  return useMemo(() => {
    const candidates: AutocompleteSuggestion[] = [];
    for (const input of calculator.inputs) {
      if (input.value.kind === 'text') continue;
      candidates.push({ name: input.key, displayName: input.key, type: 'field', description: input.label });
      if (input.value.kind === 'material' || input.value.kind === 'labor') {
        const category = input.value.category;
        const items: Array<{ category: string; properties?: Array<{ name: string }> }> =
          input.value.kind === 'material' ? library.materials : library.labor;
        const properties = new Set<string>();
        items
          .filter((item) => !category || item.category === category)
          .forEach((item) => item.properties?.forEach((property) => properties.add(property.name)));
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

// A step's formula with the same autocomplete as module formulas: type a name, pick with
// arrows and Enter or Tab.
export function StepFormulaEditor({
  id,
  calculator,
  step,
  library,
  value,
  error,
  onChange,
}: {
  id: string;
  calculator: Calculator;
  step: CalculatorStep;
  library: CalculatorLibrary;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const candidates = useCandidates(calculator, step, library);
  const stepKeys = useMemo(() => new Set(calculator.steps.map((other) => other.key)), [calculator.steps]);
  const {
    autocompleteSuggestions,
    selectedSuggestionIndex,
    isAutocompleteOpen,
    autocompletePosition,
    currentWord,
    insertSuggestion,
    handleAutocompleteKeyDown,
    updateAutocompleteSuggestionsFinal,
    setSelectedSuggestionIndex,
    setIsAutocompleteOpen,
  } = useFormulaAutocomplete({
    formula: value,
    formulaTextareaRef: textareaRef,
    collectAutocompleteCandidates: candidates,
    onFormulaChange: onChange,
  });

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        autoGrow
        rows={2}
        value={value}
        error={error}
        spellCheck={false}
        placeholder="e.g. area_rectangle(width, height)"
        className="font-numeric text-[13px] leading-relaxed"
        onChange={(event) => {
          onChange(event.target.value);
          requestAnimationFrame(() => updateAutocompleteSuggestionsFinal());
        }}
        onKeyDown={(event) => {
          if (handleAutocompleteKeyDown(event)) return;
          if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
            requestAnimationFrame(() => updateAutocompleteSuggestionsFinal());
          }
        }}
        onBlur={() => {
          setTimeout(() => setIsAutocompleteOpen(false), 200);
          // Tidy the spacing once the box is left; a formula that doesn't parse stays as typed.
          tidyFormulaAfterBlur(textareaRef.current, onChange);
        }}
      />
      {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
        <div
          role="listbox"
          aria-label="Suggestions"
          className="fixed z-50 min-w-[280px] max-h-64 overflow-y-auto py-1 rounded-lg border border-border-strong bg-surface shadow-panel"
          style={{ top: autocompletePosition.top, left: autocompletePosition.left }}
          onMouseDown={(event) => event.preventDefault()}
        >
          {autocompleteSuggestions.slice(0, 8).map((suggestion, index) => (
            <button
              key={`${suggestion.name}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedSuggestionIndex}
              onClick={() => insertSuggestion(suggestion, currentWord)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
              className={cn(
                'w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors',
                index === selectedSuggestionIndex ? 'bg-action-bg text-ink' : 'text-ink-body hover:bg-surface-hover'
              )}
            >
              <code className="flex-1 text-xs font-numeric">{suggestion.displayName}</code>
              {suggestion.description && (
                <span className="max-w-[160px] truncate text-[11px] text-ink-muted">{suggestion.description}</span>
              )}
              <span className="text-[10px] uppercase tracking-wide text-ink-faint">
                {suggestion.type === 'field' && stepKeys.has(suggestion.name) ? 'step' : TYPE_LABEL[suggestion.type]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
