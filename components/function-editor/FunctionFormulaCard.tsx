'use client';

import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

interface AutocompleteSuggestion {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
  functionSignature?: string;
}

interface WordInfo {
  word: string;
  start: number;
  end: number;
  hasDot: boolean;
  baseWord: string;
}

interface FunctionFormulaCardProps {
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: { valid: boolean; error?: string };
  formulaError?: string;
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
  return (
    <Card title="Formula">
      <div className="space-y-4">
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
            }}
            rows={4}
            placeholder="e.g., width * height"
            error={formulaError}
            className={cn('font-mono text-sm', !formulaValidation.valid && formula && 'border-destructive')}
          />
          {/* Autocomplete Dropdown */}
          {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
            <div
              className="fixed z-50 bg-md-surface-container border border-md-outline rounded-lg elevation-4 max-h-64 overflow-y-auto"
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
                      isSelected ? 'bg-md-primary text-md-on-primary' : 'hover:bg-md-surface-variant'
                    )}
                  >
                    <code className="text-xs font-mono flex-1">{suggestion.displayName}</code>
                    {isRecent && <span className="text-xs text-md-on-surface-variant">●</span>}
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        suggestion.type === 'field' && 'bg-md-primary/10 text-md-primary',
                        suggestion.type === 'function' && 'bg-warning/10 text-warning',
                        suggestion.type === 'constant' && 'bg-warning/10 text-warning'
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
        {formulaValidation.error && <p className="text-sm text-destructive">{formulaValidation.error}</p>}
        {formulaValidation.valid && formula && <p className="text-sm text-success">Formula is valid</p>}
        <p className="text-xs text-md-on-surface-variant">
          Use parameter names, functions, and constants in your formula. Example: if you have parameters &quot;width&quot; and &quot;height&quot;,
          your formula could be &quot;width * height&quot; or &quot;area(width, height)&quot;.
        </p>
      </div>
    </Card>
  );
}


