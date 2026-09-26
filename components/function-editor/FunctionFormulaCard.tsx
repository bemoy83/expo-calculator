'use client';

import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { FormulaVariableToken } from '@/components/formula/FormulaVariableToken';
import { FormulaOperatorGuide } from '@/components/formula/FormulaOperatorGuide';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';
import { containsStandalone } from '@/lib/formula/identifiers';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';

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
    <Card title="Formula" density="dense">
      <div className="space-y-4">
        {visibleParameters.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Parameters</h4>
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
        <div className="relative">
          <Textarea
            ref={formulaTextareaRef}
            label="Formula"
            value={formula}
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
            className="font-numeric text-[13px] leading-relaxed"
          />
          {/* Autocomplete Dropdown */}
          {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
            <div
              className="fixed z-50 bg-surface border border-border-strong rounded-lg shadow-panel max-h-64 overflow-y-auto py-1"
              style={{
                top: `${autocompletePosition.top}px`,
                left: `${autocompletePosition.left}px`,
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
                      isSelected ? 'bg-action-bg text-ink' : 'text-ink-body hover:bg-surface-hover'
                    )}
                  >
                    <code className="text-xs font-numeric flex-1">{suggestion.displayName}</code>
                    {isRecent && <span className="text-xs text-ink-faint" title="Recently used">●</span>}
                    <span
                      className={cn(
                        'text-[10.5px] px-1.5 py-0.5 rounded-full font-medium',
                        suggestion.type === 'field' && 'bg-action-bg text-action',
                        (suggestion.type === 'function' || suggestion.type === 'constant') && 'bg-sunken text-ink-body'
                      )}
                    >
                      {suggestion.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {formulaValidation.error && <p className="text-xs text-danger">{formulaValidation.error}</p>}
        {formulaValidation.valid && formula && <p className="text-xs font-medium text-committed">Formula is valid</p>}
        <p className="text-xs text-ink-muted">
          Use parameter names, functions, and constants in your formula. Example: if you have parameters &quot;width&quot; and &quot;height&quot;,
          your formula could be &quot;width * height&quot; or &quot;area(width, height)&quot;.
        </p>
        <FormulaOperatorGuide onInsertOperator={onInsertOperator} />
      </div>
    </Card>
  );
}
