'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { FormulaPalette } from '@/components/formula/FormulaPalette';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion, clampSuggestionLeft } from '@/hooks/use-formula-autocomplete';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';
import { FormulaText, suggestionToken, TOKEN_TEXT } from '@/components/formula/FormulaText';
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
  /** Names the formula uses that aren't parameters yet, each offered as "+ Create parameter" */
  unknownNames?: string[];
  onCreateParameter?: (name: string) => void;
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
  unknownNames = [],
  onCreateParameter,
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

  // The formula box and the palette under it (mockup 2a). The page keeps both on screen.
  return (
    <section aria-label="Formula" className="flex flex-col gap-4">
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={formulaTextareaRef}
            aria-label="Formula"
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
            placeholder="e.g. ceil(width / spacing) + 1"
            error={formulaError}
            className="min-h-[150px] font-numeric text-lg leading-[1.6] p-5"
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
        {onCreateParameter && unknownNames.length > 0 && (
          <div className="flex flex-wrap gap-1 -ml-2">
            {unknownNames.slice(0, 6).map((name) => (
              <Button key={name} variant="ghost" size="sm" onClick={() => onCreateParameter(name)} className="px-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Create parameter “<span className="font-numeric">{name}</span>”
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
      <FormulaPalette
        parameters={visibleParameters.map((param) => param.name)}
        onInsertParameter={onInsertParameter}
        onInsertOperator={onInsertOperator}
      />
    </section>
  );
}
