'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormulaPalette } from '@/components/formula/FormulaPalette';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion, clampSuggestionLeft } from '@/hooks/use-formula-autocomplete';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';
import { FormulaText, suggestionToken, TOKEN_TEXT } from '@/components/formula/FormulaText';
import type { FormulaNames } from '@/lib/calculator/formula-tokens';
import { findFormulaErrorRange } from '@/lib/formula/error-location';
import { findStoredParametersNamed, renameFormulaName, type ParameterSuggestion } from '@/lib/functions/function-editor-helpers';

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
  /** Parameters other functions and calculators already have, offered for a name the formula uses */
  storedParameters?: ParameterSuggestion[];
  onReuseParameter?: (suggestion: ParameterSuggestion) => void;
  /** Names the formula can use, to colour it as it's typed. */
  formulaNames?: FormulaNames;
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: { valid: boolean; error?: string; pending?: boolean };
  formulaError?: string;
  /** A likely misspelt material property, a hint rather than an error */
  propertyHint?: string;
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

// The formula's type steps down as it gets longer, and to 80% in a narrow pane (mockup 2a).
function formulaFontSize(length: number, narrow: boolean): number {
  const size = length < 40 ? 30 : length < 90 ? 24 : 20;
  return narrow ? Math.round(size * 0.8) : size;
}

/** Below this the pane is "narrow": smaller type, collapsed toolbar, a single-list picker. */
const NARROW_BELOW = 640;

export function FunctionFormulaCard({
  unknownNames = [],
  onCreateParameter,
  storedParameters = [],
  onReuseParameter,
  formulaNames,
  formula,
  onFormulaChange,
  formulaTextareaRef,
  formulaValidation,
  formulaError,
  propertyHint,
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

  const rootRef = useRef<HTMLElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const narrow = width > 0 && width < NARROW_BELOW;

  // Narrow is the pane's own width, not the window's: it depends on which side panels are open.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const fontSize = formulaFontSize(formula.length, narrow);
  // An undefined variable is listed with its "Create parameter" fix, so it isn't said twice.
  const validationError =
    unknownNames.length > 0 && formulaValidation.error?.startsWith('Undefined variable') ? undefined : formulaValidation.error;
  const hasError = Boolean(formulaValidation.error || formulaError || unknownNames.length > 0);
  // Where the syntax breaks, once the check has settled (it holds an error back while the formula is being typed).
  const errorRange = useMemo(
    () => (!formulaValidation.valid && !formulaValidation.pending && formula.trim() ? findFormulaErrorRange(formula) : null),
    [formula, formulaValidation.valid, formulaValidation.pending]
  );
  const isEmpty = formula.trim() === '';

  // The text area grows with its text, so the pane's scroll region does the scrolling.
  useLayoutEffect(() => {
    const el = formulaTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [formula, fontSize, width, formulaTextareaRef]);

  // The selected part of the formula, so the palette can say what it would do with it. The browser
  // draws the selection itself: palette clicks don't take focus, so it stays on screen.
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  // What the last palette action did, shown under the formula until the next edit.
  const [status, setStatus] = useState<string | null>(null);
  const selectedText = selection ? formula.slice(selection.start, selection.end) : '';
  const hasSelection = selectedText.trim() !== '';

  const syncSelection = useCallback(() => {
    const el = formulaTextareaRef.current;
    if (!el) return;
    setSelection(el.selectionStart !== el.selectionEnd ? { start: el.selectionStart, end: el.selectionEnd } : null);
  }, [formulaTextareaRef]);

  const insertParameter = (name: string) => {
    if (hasSelection) setStatus('Replaced the selection');
    onInsertParameter(name);
    setSelection(null);
  };

  const insertOperator = (operator: string) => {
    const isFunction = operator.length > 2 && operator.includes('(');
    const isComparison = ['==', '!=', '>=', '<=', '>', '<'].includes(operator);
    if (hasSelection) {
      setStatus(
        isFunction
          ? `Wrapped in ${operator.slice(0, operator.indexOf('('))}( )`
          : operator === '()'
            ? 'Wrapped in ( )'
            : isComparison
              ? 'Wrapped as a comparison. Type what to compare with.'
              : 'Replaced the selection'
      );
    }
    onInsertOperator(operator);
    setSelection(null);
  };

  // Esc in the palette: back to the formula, with the selection that was drawn.
  const returnToFormula = () => {
    const el = formulaTextareaRef.current;
    if (!el) return;
    el.focus();
    if (selection) el.setSelectionRange(selection.start, selection.end);
  };

  const hint =
    status ??
    (hasSelection
      ? `“${selectedText.trim().replace(/\s+/g, ' ')}” stays selected while you use the palette.`
      : isAutocompleteOpen && autocompleteSuggestions.length > 0
        ? '↑↓ to choose · ↵ or Tab to insert · esc to close'
        : focused && !hasError
          ? isEmpty
            ? 'Start with a parameter, a number or a function.'
            : 'Type for suggestions, or use the palette. Select part of the formula to wrap it.'
          : null);

  const textStyle = { fontSize, lineHeight: 1.5 } as const;
  const textClasses = 'font-numeric whitespace-pre-wrap break-words';

  // The formula has no box: the pane is the input (mockup 2a). A bar on its left carries the
  // state, the text is drawn in type that steps down with length, and the palette is below.
  return (
    <section ref={rootRef} aria-label="Formula" className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex-1 min-h-0 overflow-auto">
        <div
          ref={regionRef}
          onMouseDown={(e) => {
            // Clicking anywhere in the region focuses the formula, caret at the end.
            if (e.target === formulaTextareaRef.current) return;
            e.preventDefault();
            const el = formulaTextareaRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }}
          className={cn(
            'grid grid-cols-[3px_minmax(0,1fr)] rounded-md cursor-text transition-colors duration-150',
            narrow ? 'gap-3.5' : 'gap-5',
            !focused && 'hover:bg-sunken-2'
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              'self-stretch transition-colors duration-150',
              focused || hasError ? 'w-[3px]' : 'w-0.5',
              hasError ? 'bg-danger' : focused ? 'bg-accent' : 'bg-border-strong'
            )}
          />
          <div className="relative min-w-0 py-1.5">
            {formulaNames && (
              <div
                aria-hidden="true"
                className={cn('absolute inset-x-0 top-1.5 text-ink pointer-events-none', textClasses)}
                style={textStyle}
              >
                <FormulaText expression={formula} names={formulaNames} wavyErrors errorRange={errorRange} />
                {/* Keeps a trailing line break's height, as the textarea does. */}
                {'\u200b'}
              </div>
            )}
            <textarea
              ref={formulaTextareaRef}
              aria-label="Formula"
              aria-invalid={hasError ? 'true' : undefined}
              value={formula}
              rows={1}
              spellCheck={false}
              onFocus={() => setFocused(true)}
              placeholder="ceil(width / spacing) + 1"
              style={textStyle}
              className={cn(
                'relative block w-full resize-none overflow-hidden bg-transparent p-0 border-0 outline-none',
                'caret-accent placeholder:text-ink-faint',
                'selection:bg-accent/30',
                formulaNames ? 'text-transparent' : 'text-ink',
                textClasses
              )}
              onSelect={syncSelection}
              onKeyUp={syncSelection}
              onMouseUp={syncSelection}
              onChange={(e) => {
                setStatus(null);
                setSelection(null);
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
              onBlur={(e) => {
                setFocused(false);
                // Delay closing to allow clicks on suggestions
                setTimeout(() => setIsAutocompleteOpen(false), 200);
                // Tabbing into the palette: leave the text as it is, so the selection still points at what it did.
                if ((e.relatedTarget as HTMLElement | null)?.closest('[role="toolbar"]')) return;
                // Tidy the spacing of a valid formula once the box is left.
                tidyFormulaAfterBlur(formulaTextareaRef.current, onFormulaChange, () => formulaValidation.valid);
              }}
            />
          </div>
        </div>
        <div className="mt-2.5 pl-[23px] flex flex-col gap-1.5 text-xs">
          {hint && <p className={cn(status || hasSelection ? 'text-ink' : 'text-ink-faint')}>{hint}</p>}
          {validationError && (
            <p className="text-danger">● {errorRange ? validationError.replace(/\s*\(character \d+\)$/, '') : validationError}</p>
          )}
          {!validationError && propertyHint && <p className="text-ink-faint">{propertyHint}</p>}
          {onCreateParameter &&
            unknownNames.slice(0, 6).map((name) => (
              <div key={name} className="flex flex-wrap items-center gap-x-2">
                <span className="text-danger">
                  ● <span className="font-numeric">{name}</span> isn’t a parameter.
                </span>
                {onReuseParameter &&
                  findStoredParametersNamed(name, storedParameters, formula.includes(`${name}.`)).map((stored) => (
                    <Button
                      key={`${stored.name}|${stored.unitSymbol ?? ''}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // The same name spelt differently (hoyde for høyde) is renamed in the formula to match.
                        if (stored.name !== name) onFormulaChange(renameFormulaName(formula, name, stored.name));
                        onReuseParameter(stored);
                      }}
                      title={`${stored.label} · in ${stored.uses} ${stored.uses === 1 ? 'place' : 'places'}`}
                      className="px-2"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        Reuse “<span className="font-numeric">{stored.name}</span>”
                        {stored.unitSymbol && <span className="font-numeric text-ink-faint"> · {stored.unitSymbol}</span>}
                      </span>
                    </Button>
                  ))}
                <Button variant="ghost" size="sm" onClick={() => onCreateParameter(name)} className="px-2">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {formula.includes(`${name}.`) ? 'Create material parameter' : 'Create parameter'} “
                    <span className="font-numeric">{name}</span>”
                  </span>
                </Button>
              </div>
            ))}
        </div>
      </div>
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
                  'w-full px-3 py-1.5 text-left flex items-center gap-3 transition-colors',
                  isSelected ? 'bg-accent-soft text-ink' : 'text-ink-body hover:bg-surface-hover'
                )}
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <code className={cn('text-xs font-numeric', TOKEN_TEXT[suggestionToken(suggestion.type).kind])}>
                    {suggestion.displayName}
                  </code>
                  {suggestion.description && <span className="text-[11.5px] text-ink-muted truncate">{suggestion.description}</span>}
                </span>
                {isRecent && (
                  <span className="text-xs text-ink-faint" title="Recently used">
                    ●
                  </span>
                )}
                <span
                  className={cn(
                    'flex-none font-numeric text-[10.5px] uppercase tracking-wide font-medium',
                    TOKEN_TEXT[suggestionToken(suggestion.type).kind] || 'text-ink-faint'
                  )}
                >
                  {suggestion.storedKey ? 'stored' : suggestion.type === 'field' ? 'parameter' : suggestionToken(suggestion.type).label}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-none">
        <FormulaPalette
          parameters={visibleParameters.map((param) => param.name)}
          selectedText={selectedText}
          narrow={narrow}
          onInsertParameter={insertParameter}
          onInsertOperator={insertOperator}
          onReturnToFormula={returnToFormula}
        />
      </div>
    </section>
  );
}
