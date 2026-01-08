'use client';

import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { FormulaVariableToken } from '@/components/formula/FormulaVariableToken';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';

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
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const visibleParameters = parameters
    .map((param, index) => ({
      key: param.name?.trim() || `parameter-${index}`,
      name: param.name?.trim() || '',
    }))
    .filter((param) => param.name);

  const isParameterInFormula = (variableName: string) => {
    if (!formula || !variableName) return false;
    const regex = new RegExp(`\\b${escapeRegex(variableName)}\\b`);
    return regex.test(formula);
  };

  const usedParametersCount = visibleParameters.filter((param) =>
    isParameterInFormula(param.name)
  ).length;

  return (
    <Card elevation={1} className="sticky top-[88px] z-40" title="Formula">
      <div className="space-y-4">
        {visibleParameters.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-md-primary">Parameters</h4>
              <span className="text-xs text-md-on-surface-variant">
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
          <p className="text-xs text-md-on-surface-variant">
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
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
            Supported Operators
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => onInsertOperator('+')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert addition operator"
            >
              <code className="text-md-primary font-mono">+</code> <span className="text-md-on-surface-variant ml-1">Add</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('-')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert subtraction operator"
            >
              <code className="text-md-primary font-mono font-semibold">-</code> <span className="text-md-on-surface-variant ml-1">Subtract</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('*')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert multiplication operator"
            >
              <code className="text-md-primary font-mono font-semibold">*</code> <span className="text-md-on-surface-variant ml-1">Multiply</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('/')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert division operator"
            >
              <code className="text-md-primary font-mono font-semibold">/</code> <span className="text-md-on-surface-variant ml-1">Divide</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('()')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert parentheses"
            >
              <code className="text-md-primary font-mono font-semibold">()</code> <span className="text-md-on-surface-variant ml-1">Grouping</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('sqrt()')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert square root function"
            >
              <code className="text-md-primary font-mono font-semibold">sqrt()</code> <span className="text-md-on-surface-variant ml-1">Square root</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('round()')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert round function"
            >
              <code className="text-md-primary font-mono font-semibold">round(x)</code> <span className="text-md-on-surface-variant ml-1">Round to nearest integer</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('round(, )')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert round function with decimals"
            >
              <code className="text-md-primary font-mono font-semibold">round(x, decimals)</code> <span className="text-md-on-surface-variant ml-1">Round to fixed decimals</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('ceil()')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert ceil function"
            >
              <code className="text-md-primary font-mono font-semibold">ceil(x)</code> <span className="text-md-on-surface-variant ml-1">Round up to next integer</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertOperator('floor()')}
              className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
              aria-label="Insert floor function"
            >
              <code className="text-md-primary font-mono font-semibold">floor(x)</code> <span className="text-md-on-surface-variant ml-1">Round down to previous integer</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h5 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
              Comparison Operators
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => onInsertOperator('==')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert equals operator"
              >
                <code className="text-md-primary font-mono font-semibold">==</code> <span className="text-md-on-surface-variant ml-1">Equals</span>
              </button>
              <button
                type="button"
                onClick={() => onInsertOperator('!=')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert not equals operator"
              >
                <code className="text-md-primary font-mono font-semibold">!=</code> <span className="text-md-on-surface-variant ml-1">Not equals</span>
              </button>
              <button
                type="button"
                onClick={() => onInsertOperator('>')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert greater than operator"
              >
                <code className="text-md-primary font-mono font-semibold">&gt;</code> <span className="text-md-on-surface-variant ml-1">Greater than</span>
              </button>
              <button
                type="button"
                onClick={() => onInsertOperator('<')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert less than operator"
              >
                <code className="text-md-primary font-mono font-semibold">&lt;</code> <span className="text-md-on-surface-variant ml-1">Less than</span>
              </button>
              <button
                type="button"
                onClick={() => onInsertOperator('>=')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert greater or equal operator"
              >
                <code className="text-md-primary font-mono font-semibold">&gt;=</code> <span className="text-md-on-surface-variant ml-1">Greater or equal</span>
              </button>
              <button
                type="button"
                onClick={() => onInsertOperator('<=')}
                className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                aria-label="Insert less or equal operator"
              >
                <code className="text-md-primary font-mono font-semibold">&lt;=</code> <span className="text-md-on-surface-variant ml-1">Less or equal</span>
              </button>
            </div>
            <p className="text-xs text-md-on-surface-variant mt-3 px-2">
              <strong>Note:</strong> Boolean values convert to 1 (true) or 0 (false). Use comparisons for conditional logic, e.g., <code className="text-md-primary">base_price * (include_tax == 1)</code>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
