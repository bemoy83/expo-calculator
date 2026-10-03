'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormulaPalette } from '@/components/formula/FormulaPalette';
import { cn } from '@/lib/utils';
import { AutocompleteSuggestion, clampSuggestionLeft } from '@/hooks/use-formula-autocomplete';
import { tidyFormulaAfterBlur } from '@/lib/formula/prettify';
import { useTidyOffer } from '@/hooks/use-tidy-offer';
import { ISSUE_LEVELS, IssueLine, IssueMarker } from '@/components/formula/IssueMarker';
import { TidyOffer } from '@/components/formula/TidyOffer';
import { FormulaText, suggestionToken, TOKEN_TEXT } from '@/components/formula/FormulaText';
import type { FormulaNames } from '@/lib/calculator/formula-tokens';
import type { FormulaEditorHandle } from './FormulaEditorCM';
import { findFormulaErrorRange } from '@/lib/formula/error-location';
import type { FormulaIssue, FormulaIssueLevel } from '@/lib/formula/issue-levels';
import {
  findStoredParametersNamed,
  planUnknownNames,
  renameFormulaName,
  type ParameterSuggestion,
} from '@/lib/functions/function-editor-helpers';

// SPIKE: the CodeMirror surface, loaded only when asked for, so it adds nothing to the page's own bundle.
const FormulaEditorCM = dynamic(() => import('./FormulaEditorCM'), { ssr: false });

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
  /** SPIKE: draw the formula with CodeMirror instead of a textarea; what it needs for suggestions */
  cm?: {
    candidates: AutocompleteSuggestion[];
    candidatesForBase?: (base: string) => AutocompleteSuggestion[];
    onSuggestionInserted?: (suggestion: AutocompleteSuggestion) => void;
  };
  /** Names the formula uses that aren't parameters yet, each offered as "+ Create parameter" */
  unknownNames?: string[];
  onCreateParameter?: (name: string) => void;
  /** Parameters other functions and calculators already have, offered for a name the formula uses */
  storedParameters?: ParameterSuggestion[];
  onReuseParameter?: (suggestion: ParameterSuggestion) => void;
  /** The same for every name at once: made as new, or reused from storage */
  onCreateParameters?: (names: string[]) => void;
  onReuseParameters?: (suggestions: ParameterSuggestion[]) => void;
  /** Names the formula can use, to colour it as it's typed. */
  formulaNames?: FormulaNames;
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: { valid: boolean; error?: string; pending?: boolean };
  formulaError?: string;
  /** A likely misspelt material property, a hint rather than an error */
  /** What the formula has to say about itself, by level (see classifyFormulaIssues) */
  issues?: FormulaIssue[];
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
  cm,
  unknownNames = [],
  onCreateParameter,
  storedParameters = [],
  onReuseParameter,
  onCreateParameters,
  onReuseParameters,
  formulaNames,
  formula,
  onFormulaChange,
  formulaTextareaRef,
  formulaValidation,
  formulaError,
  issues = [],
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
  const cmHandle = useRef<FormulaEditorHandle | null>(null);
  const [cmCompletionOpen, setCmCompletionOpen] = useState(false);
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
  // The most serious level present colours the bar beside the formula.
  const worst: FormulaIssueLevel | null = issues.some((issue) => issue.level === 'broken')
    ? 'broken'
    : issues.some((issue) => issue.level === 'unresolved')
      ? 'unresolved'
      : null;
  const hasError = Boolean(worst || formulaError);
  // Where the syntax breaks, once the check has settled (it holds an error back while the formula is being typed).
  const errorRange = useMemo(
    () => (!formulaValidation.valid && !formulaValidation.pending && formula.trim() ? findFormulaErrorRange(formula) : null),
    [formula, formulaValidation.valid, formulaValidation.pending]
  );
  // With several unknown names, one line can add them all: reuse the ones with a single stored match,
  // create the ones with none. A name with several stored matches is left to its own line.
  const plan = planUnknownNames(unknownNames, formula, storedParameters);
  const showBulk = unknownNames.length >= 2 && plan.reuse.length + plan.create.length >= 2;
  const reuseAll = () => {
    // A name spelt differently (hoyde for høyde) is renamed in the formula to the stored spelling.
    const renamed = plan.reuse.reduce((text, { name, stored }) => renameFormulaName(text, name, stored.name), formula);
    if (renamed !== formula) onFormulaChange(renamed);
    onReuseParameters?.(plan.reuse.map(({ stored }) => stored));
  };
  // Spacing that could be tidied is offered after a moment of rest, not applied under the cursor.
  const tidy = useTidyOffer({
    formula,
    textareaRef: formulaTextareaRef,
    onFormulaChange,
    onApplied: () => setIsAutocompleteOpen(false),
    applyWith: cm ? (tidied) => cmHandle.current?.applyTidy(tidied) : undefined,
  });
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
    if (cm) cmHandle.current?.insertToken(name);
    else onInsertParameter(name);
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
    if (cm) cmHandle.current?.insertOperator(operator);
    else onInsertOperator(operator);
    setSelection(null);
  };

  // Esc in the palette: back to the formula, with the selection that was drawn.
  const returnToFormula = () => {
    if (cm) {
      cmHandle.current?.focus();
      if (selection) cmHandle.current?.setSelection(selection.start, selection.end);
      return;
    }
    const el = formulaTextareaRef.current;
    if (!el) return;
    el.focus();
    if (selection) el.setSelectionRange(selection.start, selection.end);
  };

  const hint =
    status ??
    (hasSelection
      ? `“${selectedText.trim().replace(/\s+/g, ' ')}” stays selected while you use the palette.`
      : (cm ? cmCompletionOpen : isAutocompleteOpen && autocompleteSuggestions.length > 0)
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
            if (cm) {
              if ((e.target as HTMLElement).closest('.cm-editor')) return;
              e.preventDefault();
              cmHandle.current?.setSelection(formula.length, formula.length);
              cmHandle.current?.focus();
              return;
            }
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
              focused || worst ? 'w-[3px]' : 'w-0.5',
              worst === 'broken' ? 'bg-danger' : worst === 'unresolved' ? 'bg-draft' : focused ? 'bg-accent' : 'bg-border-strong'
            )}
          />
          <div className="relative min-w-0 py-1.5">
            {cm ? (
              <FormulaEditorCM
                value={formula}
                onChange={(next) => {
                  setStatus(null);
                  setSelection(null);
                  onFormulaChange(next);
                }}
                names={formulaNames}
                errorRange={errorRange}
                fontSize={fontSize}
                placeholderText="ceil(width / spacing) + 1"
                invalid={hasError}
                candidates={cm.candidates}
                candidatesForBase={cm.candidatesForBase}
                onSuggestionInserted={cm.onSuggestionInserted}
                onSelectionChange={(sel) => setSelection(sel ? { start: sel.from, end: sel.to } : null)}
                onCompletionOpenChange={setCmCompletionOpen}
                onFocusChange={(isFocused, related) => {
                  setFocused(isFocused);
                  if (isFocused) return;
                  // Tabbing into the palette: leave the text as it is, so the selection still points at what it did.
                  if ((related as HTMLElement | null)?.closest?.('[role="toolbar"]')) return;
                  // Tidy the spacing of a valid formula once the box is left, as one undo step.
                  const tidiedNow = tidy.tidied;
                  setTimeout(() => {
                    if (cmHandle.current && !cmHandle.current.hasFocus() && formulaValidation.valid && tidiedNow !== formula) {
                      cmHandle.current.applyTidy(tidiedNow, false);
                    }
                  }, 300);
                }}
                handleRef={cmHandle}
              />
            ) : (
              <>
                {formulaNames && (
                  <div
                    aria-hidden="true"
                    className={cn('absolute inset-x-0 top-1.5 text-ink pointer-events-none', textClasses)}
                    style={textStyle}
                  >
                    <FormulaText expression={formula} names={formulaNames} markUnresolved errorRange={errorRange} />
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
                    if (tidy.tidying.current) return;
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
              </>
            )}
          </div>
        </div>
        <div className="mt-2.5 pl-[23px] flex flex-col gap-1.5 text-xs">
          {hint && <p className={cn(status || hasSelection ? 'text-ink' : 'text-ink-faint')}>{hint}</p>}
          {issues
            .filter((issue) => !issue.name)
            .map((issue) => (
              <IssueLine key={`${issue.level}-${issue.message}`} level={issue.level}>
                {issue.level === 'broken' && errorRange ? issue.message.replace(/\s*\(character \d+\)$/, '') : issue.message}
              </IssueLine>
            ))}
          {showBulk && onCreateParameters && onReuseParameters && (
            <div className="flex flex-wrap items-center gap-x-2">
              <span className={ISSUE_LEVELS.unresolved.text}>
                <IssueMarker level="unresolved" /> {unknownNames.length} names aren’t parameters yet.
              </span>
              {plan.reuse.length > 0 && (
                <Button variant="ghost" size="sm" onClick={reuseAll} className="px-2">
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reuse {plan.reuse.length} stored</span>
                </Button>
              )}
              {plan.create.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onCreateParameters(plan.create)} className="px-2">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Create {plan.create.length} new</span>
                </Button>
              )}
            </div>
          )}
          {tidy.show && <TidyOffer tidied={tidy.tidied} onApply={tidy.apply} />}
          {onCreateParameter &&
            unknownNames.slice(0, 6).map((name) => (
              <div key={name} className="flex flex-wrap items-center gap-x-2">
                <span className={ISSUE_LEVELS.unresolved.text}>
                  <IssueMarker level="unresolved" /> <span className="font-numeric">{name}</span> isn’t a parameter yet.
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
      {!cm && isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
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
