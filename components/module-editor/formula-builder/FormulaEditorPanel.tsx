'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
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
        <label htmlFor="formula-input" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Cost formula
        </label>
        {formula && (
          <div className="flex items-center space-x-1" role="status" aria-live="polite">
            {formulaValidation.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-committed" aria-hidden="true" />
                <span className="text-xs text-committed font-medium">Valid</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                <span className="text-xs text-danger font-medium">Invalid</span>
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
          className="font-numeric text-[13px] leading-relaxed"
        />
        {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
          <div
            className="fixed z-50 bg-surface border border-border-strong rounded-lg shadow-panel max-h-64 overflow-y-auto py-1"
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
                    isSelected ? 'bg-action-bg text-ink' : 'text-ink-body hover:bg-surface-hover'
                  )}
                >
                  <code className="text-xs font-numeric flex-1">{suggestion.displayName}</code>
                  {isRecent && (
                    <span className="text-xs text-ink-faint" title="Recently used">●</span>
                  )}
                  <span className={cn(
                    'text-[10.5px] px-1.5 py-0.5 rounded-full font-medium',
                    suggestion.type === 'field' && 'bg-action-bg text-action',
                    suggestion.type === 'material' && 'bg-committed-bg text-committed',
                    suggestion.type === 'property' && 'bg-action-bg text-action',
                    (suggestion.type === 'function' || suggestion.type === 'constant') && 'bg-sunken text-ink-body'
                  )}>
                    {suggestion.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
