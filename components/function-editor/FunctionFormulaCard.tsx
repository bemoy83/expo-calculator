'use client';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Textarea } from '@/components/ui/Textarea';
import { FormulaVariableToken } from '@/components/formula/FormulaVariableToken';
import { FormulaOperatorGuide } from '@/components/formula/FormulaOperatorGuide';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion, clampSuggestionLeft } from '@/hooks/use-formula-autocomplete';
import { containsStandalone } from '@/lib/formula/identifiers';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';
import { FormulaLegend, FormulaText, suggestionToken, TOKEN_TEXT } from '@/components/formula/FormulaText';
import type { FormulaNames } from '@/lib/calculator/formula-tokens';

interface WordInfo {
  word: string;
  start: number;
  end: number;
  hasDot: boolean;
  baseWord: string;
}

interface ParameterInfo {
  name: string;
  label?: string;
}

interface FunctionFormulaCardProps {
  /** Names the formula can use, to colour it as it's typed. */
  formulaNames?: FormulaNames;
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: { valid: boolean; error?: string };
  formulaError?: string;
  parameters: ParameterInfo[];
  onInsertParameter: (variableName: string) => void;
  onInsertOperator: (operator: string) => void;
  autocompleteSuggestions: AutocompleteSuggestion[];
  selectedSuggestionIndex: number;
  isAutocompleteOpen: boolean;
  autocompletePosition: { top: number; left: number };
  currentWord: WordInfo;
  recentlyUsedVariables: string[];
  insertSuggestion: (suggestion: AutocompleteSuggestion, wordInfo: WordInfo) => void;
  handleAutocompleteKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  updateAutocompleteSuggestionsFinal: () => void;
  setSelectedSuggestionIndex: (index: number) => void;
  setIsAutocompleteOpen: (open: boolean) => void;
}

export function FunctionFormulaCard({
  formulaNames,
  formula,
  onFormulaChange,
  formulaTextareaRef,
  formulaValidation,
  formulaError,
  parameters,
  onInsertParameter,
  onInsertOperator,
  autocompleteSuggestions,
  selectedSuggestionIndex,
  isAutocompleteOpen,
  autocompletePosition,
  currentWord,
  recentlyUsedVariables,
  insertSuggestion,
  handleAutocompleteKeyDown,
  updateAutocompleteSuggestionsFinal,
  setSelectedSuggestionIndex,
  setIsAutocompleteOpen,
}: FunctionFormulaCardProps) {
  const visibleParameters = parameters
    .map((param, index) => ({
      key: param.name?.trim() || `parameter-${index}`,
      name: param.name?.trim() || '',
    }))
    .filter((param) => param.name);

  const isParameterInFormula = (variableName: string) => {
    if (!formula || !variableName) return false;
    return containsStandalone(formula, variableName);
  };

  const usedParametersCount = visibleParameters.filter((param) =>
    isParameterInFormula(param.name)
  ).length;

  return (
    <section aria-labelledby="formula-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow as="h3" id="formula-heading">
          Formula
        </Eyebrow>
        {formula && formulaValidation.valid && <span className="text-xs text-committed">Formula is valid</span>}
      </div>
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            ref={formulaTextareaRef}
            aria-labelledby="formula-heading"
            value={formula}
            highlight={formulaNames ? <FormulaText expression={formula} names={formulaNames} /> : undefined}
            onChange={(e) => {
              onFormulaChange(e.target.value);
              // Update autocomplete immediately with the new value
              requestAnimationFrame(() => {
                updateAutocompleteSuggestionsFinal();
              });
            }}
            onKeyDown={(e) => {
              // Filter out modifier keys and non-character inputs
              const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
              const isNonCharacterKey = [
                'Backspace',
                'Delete',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
                'PageUp',
                'PageDown',
                'Tab',
                'Enter',
                'Escape',
                'Shift',
                'Control',
                'Alt',
                'Meta',
                'CapsLock',
                'NumLock',
                'ScrollLock',
              ].includes(e.key);

              // Handle autocomplete navigation first
              const handled = handleAutocompleteKeyDown(e);
              if (handled) {
                return; // Autocomplete handled the key
              }

              // Only update suggestions for character input (not modifiers or navigation)
              if (!isModifierKey && !isNonCharacterKey && e.key.length === 1) {
                // Character input - update suggestions after the character is inserted
                requestAnimationFrame(() => {
                  updateAutocompleteSuggestionsFinal();
                });
              } else if (isNonCharacterKey && ['Backspace', 'Delete'].includes(e.key)) {
                // Backspace/Delete - update suggestions after deletion
                requestAnimationFrame(() => {
                  updateAutocompleteSuggestionsFinal();
                });
              }
            }}
            onBlur={() => {
              // Delay closing to allow clicks on suggestions
              setTimeout(() => setIsAutocompleteOpen(false), 200);
              // Tidy the spacing of a valid formula once the box is left.
              tidyFormulaAfterBlur(formulaTextareaRef.current, onFormulaChange, () => formulaValidation.valid);
            }}
            rows={4}
            placeholder=""
            error={formulaError}
            className="font-numeric text-[15px] leading-[1.6] px-4 py-3.5"
          />
          {/* Autocomplete Dropdown */}
          {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
            <div
              className="fixed z-50 bg-surface border border-border-strong rounded-row shadow-panel max-h-64 overflow-y-auto py-1"
              style={{
                top: `${autocompletePosition.top}px`,
                left: `${clampSuggestionLeft(autocompletePosition.left)}px`,
                minWidth: '280px',
              }}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur
            >
              {autocompleteSuggestions.slice(0, 8).map((suggestion, index) => {
                const isSelected = index === selectedSuggestionIndex;
                const isRecent = recentlyUsedVariables.includes(suggestion.name);

                return (
                  <button
                    key={`${suggestion.name}-${index}`}
                    type="button"
                    onClick={() => {
                      insertSuggestion(suggestion, currentWord);
                    }}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    className={cn(
                      'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                      isSelected ? 'bg-accent-soft text-ink' : 'text-ink-body hover:bg-surface-hover'
                    )}
                  >
                    <code className={cn('text-xs font-numeric flex-1', TOKEN_TEXT[suggestionToken(suggestion.type).kind])}>
                      {suggestion.displayName}
                    </code>
                    {isRecent && <span className="text-xs text-ink-faint" title="Recently used">●</span>}
                    <span
                      className={cn(
                        'text-[10.5px] uppercase tracking-wide font-medium',
                        TOKEN_TEXT[suggestionToken(suggestion.type).kind] || 'text-ink-faint'
                      )}
                    >
                      {suggestion.type === 'field' ? 'parameter' : suggestionToken(suggestion.type).label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {formulaValidation.error && <p className="text-xs text-danger">{formulaValidation.error}</p>}
        {visibleParameters.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs text-ink-muted">Insert a parameter</h4>
              <span className="text-[11px] font-numeric text-ink-faint">
                {usedParametersCount}/{visibleParameters.length} used
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleParameters.map((param) => (
                <FormulaVariableToken
                  key={param.key}
                  label={param.name}
                  value={param.name}
                  isUsed={isParameterInFormula(param.name)}
                  onInsert={onInsertParameter}
                  size="sm"
                  layout="stretch"
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">
            Add parameters to make them available as variables here.
          </p>
        )}

        <p className="text-xs text-ink-muted">
          Use parameter names, functions, and constants in your formula. Example: if you have parameters &quot;width&quot; and &quot;height&quot;,
          your formula could be &quot;width * height&quot; or &quot;area(width, height)&quot;.
        </p>
        <FormulaLegend inputLabel="parameter" />
        <FormulaOperatorGuide onInsertOperator={onInsertOperator} />
      </div>
    </section>
  );
}
