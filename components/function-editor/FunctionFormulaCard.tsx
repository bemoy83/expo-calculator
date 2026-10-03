'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormulaPalette } from '@/components/formula/FormulaPalette';
import { FormulaEditor, type FormulaEditorHandle } from '@/components/formula/FormulaEditorLazy';
import { cn } from '@/lib/utils';
import type { AutocompleteSuggestion } from '@/lib/formula/suggestions';
import { useTidyOffer } from '@/hooks/use-tidy-offer';
import { ISSUE_LEVELS, IssueLine, IssueMarker, PinnedNotes } from '@/components/formula/IssueMarker';
import { TidyOffer } from '@/components/formula/TidyOffer';
import { unknownNameRanges, type FormulaNames } from '@/lib/calculator/formula-tokens';
import { collectDiagnostics, plainSyntaxMessage } from '@/lib/formula/diagnostics';
import { findFormulaErrorRange } from '@/lib/formula/error-location';
import type { FormulaDiagnostic, FormulaIssue, FormulaIssueLevel, FormulaNote } from '@/lib/formula/issue-levels';
import {
  findStoredParametersNamed,
  planUnknownNames,
  renameFormulaName,
  type ParameterSuggestion,
} from '@/lib/functions/function-editor-helpers';

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
  /** The same for every name at once: made as new, or reused from storage */
  onCreateParameters?: (names: string[]) => void;
  onReuseParameters?: (suggestions: ParameterSuggestion[]) => void;
  /** Names the formula can use, to colour it as it's typed. */
  formulaNames?: FormulaNames;
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaValidation: { valid: boolean; error?: string; pending?: boolean };
  formulaError?: string;
  /** What the formula has to say about itself, by level (see classifyFormulaIssues) */
  issues?: FormulaIssue[];
  /** Units put together that don't match, pinned to the text, and what each operator works out to */
  unitProblems?: Array<{ message: string; from: number; to: number }>;
  unitNotes?: FormulaNote[];
  /** What a name is measured in, for its hover card */
  describeUnit?: (name: string) => string | undefined;
  parameters: ParameterInfo[];
  /** What the editor suggests as a name is typed, and what follows `name.` */
  candidates: AutocompleteSuggestion[];
  candidatesForBase?: (base: string) => AutocompleteSuggestion[];
  onSuggestionInserted?: (suggestion: AutocompleteSuggestion) => void;
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
  onCreateParameters,
  onReuseParameters,
  formulaNames,
  formula,
  onFormulaChange,
  formulaValidation,
  formulaError,
  issues = [],
  unitProblems = [],
  unitNotes,
  describeUnit,
  parameters,
  candidates,
  candidatesForBase,
  onSuggestionInserted,
}: FunctionFormulaCardProps) {
  const visibleParameters = parameters
    .map((param, index) => ({
      key: param.name?.trim() || `parameter-${index}`,
      name: param.name?.trim() || '',
    }))
    .filter((param) => param.name);

  const rootRef = useRef<HTMLElement>(null);
  const editor = useRef<FormulaEditorHandle | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
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
  // Heads-ups that are pinned to the text show as one quiet line where there's a pointer (see PinnedNotes).
  const pinnedNotes = unitProblems.map((problem) => problem.message).filter((message) => issues.some((issue) => issue.level === 'heads-up' && issue.message === message));
  // The same problems as the lines below, pinned to the text they're about: hover one for its message and fixes.
  const diagnostics = collectDiagnostics({
    syntax: { range: errorRange, message: issues.find((issue) => issue.level === 'broken' && !issue.name)?.message ?? formulaError },
    unknownNames:
      formulaNames && onCreateParameter
        ? {
            ranges: unknownNameRanges(formula, formulaNames),
            names: unknownNames,
            message: (name) => `${name} isn’t a parameter yet.`,
            fixes: (name) => {
              const fixes: NonNullable<FormulaDiagnostic['fixes']> = [];
              if (onReuseParameter) {
                for (const stored of findStoredParametersNamed(name, storedParameters, formula.includes(`${name}.`))) {
                  fixes.push({
                    label: `Reuse “${stored.name}”${stored.unitSymbol ? ` · ${stored.unitSymbol}` : ''}`,
                    title: `${stored.label} · in ${stored.uses} ${stored.uses === 1 ? 'place' : 'places'}`,
                    run: () => {
                      if (stored.name !== name) onFormulaChange(renameFormulaName(formula, name, stored.name));
                      onReuseParameter(stored);
                    },
                  });
                }
              }
              fixes.push({
                label: `${formula.includes(`${name}.`) ? 'Create material parameter' : 'Create parameter'} “${name}”`,
                run: () => onCreateParameter(name),
              });
              return fixes;
            },
          }
        : undefined,
    problems: unitProblems.map((problem) => ({ from: problem.from, to: problem.to, level: 'heads-up' as const, message: problem.message })),
  });
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
  const tidy = useTidyOffer({ formula, apply: (tidied) => editor.current?.applyTidy(tidied) });
  const isEmpty = formula.trim() === '';

  // The selected part of the formula, so the palette can say what it would do with it. The browser
  // draws the selection itself: palette clicks don't take focus, so it stays on screen.
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  // What the last palette action did, shown under the formula until the next edit.
  const [status, setStatus] = useState<string | null>(null);
  const selectedText = selection ? formula.slice(selection.start, selection.end) : '';
  const hasSelection = selectedText.trim() !== '';

  const insertParameter = (name: string) => {
    if (hasSelection) setStatus('Replaced the selection');
    editor.current?.insertToken(name);
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
    editor.current?.insertOperator(operator);
    setSelection(null);
  };

  // Esc in the palette: back to the formula, with the selection that was drawn.
  const returnToFormula = () => {
    editor.current?.focus();
    if (selection) editor.current?.setSelection(selection.start, selection.end);
  };

  const hint =
    status ??
    (hasSelection
      ? `“${selectedText.trim().replace(/\s+/g, ' ')}” stays selected while you use the palette.`
      : completionOpen
        ? '↑↓ to choose · ↵ or Tab to insert · esc to close'
        : focused && !hasError
          ? isEmpty
            ? 'Start with a parameter, a number or a function.'
            : 'Type for suggestions, or use the palette. Select part of the formula to wrap it.'
          : null);

  // The formula has no box: the pane is the input (mockup 2a). A bar on its left carries the
  // state, the text is drawn in type that steps down with length, and the palette is below.
  return (
    <section ref={rootRef} aria-label="Formula" className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex-1 min-h-0 overflow-auto">
        <div
          onMouseDown={(e) => {
            // Clicking anywhere in the region focuses the formula, caret at the end.
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            e.preventDefault();
            editor.current?.setSelection(formula.length, formula.length);
            editor.current?.focus();
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
            <FormulaEditor
              value={formula}
              onChange={(next) => {
                setStatus(null);
                setSelection(null);
                onFormulaChange(next);
              }}
              names={formulaNames}
              diagnostics={diagnostics}
              notes={unitNotes}
              describeUnit={describeUnit}
              fontSize={fontSize}
              placeholderText="ceil(width / spacing) + 1"
              invalid={hasError}
              fieldTagLabel="parameter"
              candidates={candidates}
              candidatesForBase={candidatesForBase}
              onSuggestionInserted={onSuggestionInserted}
              onSelectionChange={(sel) => setSelection(sel ? { start: sel.from, end: sel.to } : null)}
              onCompletionOpenChange={setCompletionOpen}
              onFocusChange={setFocused}
              tidyOnBlur
              canTidy={() => formulaValidation.valid}
              handleRef={editor}
            />
          </div>
        </div>
        <div className="mt-2.5 pl-[23px] flex flex-col gap-1.5 text-xs">
          {hint && <p className={cn(status || hasSelection ? 'text-ink' : 'text-ink-faint')}>{hint}</p>}
          {issues
            .filter((issue) => !issue.name && !pinnedNotes.includes(issue.message))
            .map((issue) => (
              <IssueLine key={`${issue.level}-${issue.message}`} level={issue.level}>
                {issue.level === 'broken' && errorRange ? plainSyntaxMessage(issue.message) : issue.message}
              </IssueLine>
            ))}
          <PinnedNotes messages={pinnedNotes} />
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
