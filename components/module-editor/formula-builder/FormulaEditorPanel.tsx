'use client';

import React from 'react';
import { Calculator, CheckCircle2, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { FormulaAutocompleteProps, FormulaValidationState } from './types';

interface FormulaEditorPanelProps extends FormulaAutocompleteProps {
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: FormulaValidationState;
  formulaError?: string;
}

const NON_CHARACTER_KEYS = [
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
];

export function FormulaEditorPanel({
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
  onSetSelectedSuggestionIndex,
  onSetIsAutocompleteOpen,
}: FormulaEditorPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="formula-input" className="text-sm font-semibold text-md-primary">Formula</label>
        {formula && (
          <div className="flex items-center space-x-1" role="status" aria-live="polite">
            {formulaValidation.valid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-md-primary" aria-hidden="true" />
                <span className="text-xs text-md-primary font-medium">Valid</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-md-error" aria-hidden="true" />
                <span className="text-xs text-md-error font-medium">Invalid</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <Textarea
          autoGrow={true}
          ref={formulaTextareaRef}
          id="formula-input"
          value={formula}
          onChange={(e) => {
            onFormulaChange(e.target.value);
            requestAnimationFrame(() => {
              updateAutocompleteSuggestionsFinal();
            });
          }}
          onKeyDown={(e) => {
            const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
            const isNonCharacterKey = NON_CHARACTER_KEYS.includes(e.key);
            const handled = handleAutocompleteKeyDown(e);
            if (handled) {
              return;
            }

            if (!isModifierKey && !isNonCharacterKey && e.key.length === 1) {
              requestAnimationFrame(() => {
                updateAutocompleteSuggestionsFinal();
              });
            } else if (isNonCharacterKey && ['Backspace', 'Delete'].includes(e.key)) {
              requestAnimationFrame(() => {
                updateAutocompleteSuggestionsFinal();
              });
            }
          }}
          onBlur={() => {
            setTimeout(() => onSetIsAutocompleteOpen(false), 200);
          }}
          error={formulaError || formulaValidation.error}
          placeholder=""
          rows={6}
          className={`font-mono text-sm text-md-primary ${
            formulaValidation.valid && formula
              ? 'border-success/50 focus:ring-success/50'
              : formula && !formulaValidation.valid
              ? 'border-destructive/50 focus:ring-destructive/50'
              : ''
          }`}
        />
        {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
          <div
            className="fixed z-50 bg-md-surface-container border border-md-outline rounded-lg elevation-4 max-h-64 overflow-y-auto"
            style={{
              top: `${autocompletePosition.top}px`,
              left: `${autocompletePosition.left}px`,
              minWidth: '280px',
            }}
            onMouseDown={(e) => e.preventDefault()}
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
                  onMouseEnter={() => onSetSelectedSuggestionIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                    isSelected
                      ? 'bg-md-primary text-md-on-primary'
                      : 'hover:bg-md-surface-variant'
                  )}
                >
                  <code className="text-xs font-mono flex-1">{suggestion.displayName}</code>
                  {isRecent && (
                    <span className="text-xs text-md-on-surface-variant">●</span>
                  )}
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    suggestion.type === 'field' && 'bg-md-primary/10 text-md-primary',
                    suggestion.type === 'material' && 'bg-success/10 text-success',
                    suggestion.type === 'property' && 'bg-md-primary-muted/10 text-md-primary-muted',
                    suggestion.type === 'function' && 'bg-warning/10 text-warning',
                    suggestion.type === 'constant' && 'bg-warning/10 text-warning'
                  )}>
                    {suggestion.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {formulaValidation.valid && formulaValidation.preview !== undefined && (
        <div className="mt-2 p-3" role="status" aria-live="polite">
          <div className="flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-md-primary" aria-hidden="true" />
            <span className="text-xs text-md-on-surface-variant">Preview (with defaults):</span>
            <span className="text-sm font-bold text-success">
              ${formulaValidation.preview.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
