'use client';

// The formula editor both the function editor and the calculator builder's step editor use:
// CodeMirror 6 with names coloured by decorations on the real text, suggestions through
// CodeMirror's list (ranked by lib/formula/suggestions), and the palette and the tidy as
// transactions, so each is one undo step and the caret and selection stay put.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Compartment, EditorState, StateField, Transaction, Annotation, Prec, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, hoverTooltip, keymap, placeholder, showTooltip, type Tooltip } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { selectNextOccurrence } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap, isolateHistory } from '@codemirror/commands';
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionStatus,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippet,
} from '@codemirror/autocomplete';
import type { FormulaNames } from '@/lib/calculator/formula-tokens';
import { decorationsField, formulaTheme, inputsField, setInputs } from '@/components/formula/formula-editor-look';
import { renderHover, renderProblems, renderSignature, renderSuggestionRow, suggestionOf } from '@/components/formula/formula-cards';
import { minimalChange } from '@/lib/formula/minimal-change';
import type { FormulaDiagnostic, FormulaNote } from '@/lib/formula/issue-levels';
import { filterSuggestions, getWordAtCursor, type AutocompleteSuggestion } from '@/lib/formula/suggestions';
import { getFormulaWithInsertedOperator, getFormulaWithInsertedToken } from '@/lib/functions/function-editor-helpers';
import { caretAfterTidy, prettifyFormula } from '@/lib/formula/prettify';
import { callAtCaret, callSignature, type CallSignature } from '@/lib/calculator/call-context';
import { foldName, isNameChar } from '@/lib/formula/identifiers';

export interface FormulaEditorHandle {
  focus(): void;
  hasFocus(): boolean;
  getSelection(): { from: number; to: number };
  setSelection(from: number, to: number): void;
  insertToken(name: string): void;
  insertOperator(operator: string): void;
  /** Replaces the formula with its tidied version as one undo step, the caret kept by the same characters. */
  applyTidy(tidied: string, focus?: boolean): void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  names?: FormulaNames;
  /** Problems pinned to the text they're about: underlined, and explained (with their fixes) on hover */
  diagnostics?: FormulaDiagnostic[];
  /** A line of explanation for a stretch of the formula (what an operator works out to), shown on hover */
  notes?: FormulaNote[];
  fontSize: number;
  lineHeight?: number;
  placeholderText: string;
  /** What the textbox is called to assistive technology */
  ariaLabel?: string;
  /** The text's colour and the like for the host element */
  className?: string;
  invalid?: boolean;
  candidates: AutocompleteSuggestion[];
  candidatesForBase?: (base: string) => AutocompleteSuggestion[];
  onSuggestionInserted?: (suggestion: AutocompleteSuggestion) => void;
  onSelectionChange?: (selection: { from: number; to: number } | null) => void;
  onFocusChange?: (focused: boolean) => void;
  onCompletionOpenChange?: (open: boolean) => void;
  /** What a field-type suggestion is called in its tag (a function's "parameter"); unset, it's called what its colour says ("input", "result") */
  fieldTagLabel?: string;
  /** A name that's another step's result is coloured as one in the suggestions */
  isStepKey?: (name: string) => boolean;
  /** What a name is worth right now (a step's current value), shown on its hover card */
  describeValue?: (name: string) => string | undefined;
  /** What a name is measured in ("length · m"), shown on its hover card */
  describeUnit?: (name: string) => string | undefined;
  /** What a called name takes, for the signature shown while the caret is inside its brackets; unset, only the built-in functions are known */
  signatureFor?: (name: string) => CallSignature | undefined;
  /** Tidy the spacing of a formula that reads fine once the editor is left (as one undo step). `canTidy` can hold it back. */
  tidyOnBlur?: boolean;
  canTidy?: () => boolean;
  handleRef: MutableRefObject<FormulaEditorHandle | null>;
}

const External = Annotation.define<boolean>();

// aria-invalid belongs on the textbox itself (the editor's content), which changes as the formula does.
const invalidAttributes = (invalid?: boolean) => EditorView.contentAttributes.of(invalid ? { 'aria-invalid': 'true' } : {});

const NO_FUNCTIONS = { functions: [] };

export default function FormulaEditorCM(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Props as of the latest render, read by the editor's long-lived listeners.
  const latest = useRef(props);
  latest.current = props;
  const recent = useRef<string[]>([]);
  const invalidCompartment = useRef(new Compartment()).current;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // ---- Suggestions: the same ranking as the textarea's hook, offered through CodeMirror's list ----
    const completionSource = (context: CompletionContext): CompletionResult | null => {
      // With several carets, a suggestion would land at one of them only.
      if (context.state.selection.ranges.length > 1) return null;
      const doc = context.state.doc.toString();
      const info = getWordAtCursor(doc, context.pos);
      if (!info.word && !info.hasDot) return null;
      const { candidates, candidatesForBase } = latest.current;
      const extra = info.hasDot && info.baseWord && candidatesForBase ? candidatesForBase(info.baseWord) : [];
      const known = new Set(candidates.map((candidate) => candidate.name));
      const suggestions = filterSuggestions(
        info.word,
        [...candidates, ...extra.filter((candidate) => !known.has(candidate.name))],
        recent.current,
        info.hasDot,
        info.baseWord
      );
      if (suggestions.length === 0) return null;
      // Eight rows, as in the textarea version's list.
      const options: Completion[] = suggestions.slice(0, 8).map((suggestion) => {
        const completion: Completion = {
          label: suggestion.name,
          type: suggestion.type,
          apply: (view, _completion, from, to) => insertSuggestion(view, suggestion, from, to),
        };
        suggestionOf.set(completion, suggestion);
        return completion;
      });
      return { from: info.start, to: info.end, options, filter: false };
    };

    const insertSuggestion = (view: EditorView, suggestion: AutocompleteSuggestion, from: number, to: number) => {
      const doc = view.state.doc.toString();
      // The word being replaced runs to the end of the name, not just to the caret.
      let end = to;
      while (end < doc.length && (isNameChar(doc[end]) || doc[end] === '.')) end += 1;
      // A call goes in as a snippet: each argument a stop to Tab through, the caret ending after the ")".
      const args =
        suggestion.type === 'function' && suggestion.functionSignature
          ? suggestion.functionSignature.split(',').map((arg) => arg.trim()).filter(Boolean)
          : null;
      let template = suggestion.name;
      if (args?.length) template = `${suggestion.name}(${args.map((arg, i) => `\${${i + 1}:${arg}}`).join(', ')})\${}`;
      else if (suggestion.type === 'function' && suggestion.displayName.includes('()')) template = `${suggestion.name}(\${1})\${}`;
      const charBefore = from > 0 ? doc[from - 1] : '';
      const spaceBefore = from > 0 && charBefore !== ' ' && charBefore !== '\t' && !/[+\-*/(]/.test(charBefore) ? ' ' : '';
      const charAfter = end < doc.length ? doc[end] : '';
      const spaceAfter = end < doc.length && charAfter !== ' ' && charAfter !== '\t' && !/[+\-*/)]/.test(charAfter) ? ' ' : '';
      snippet(`${spaceBefore}${template}${spaceAfter}`)(view, null, from, end);
      recent.current = [suggestion.name, ...recent.current.filter((name) => name !== suggestion.name)].slice(0, 15);
      latest.current.onSuggestionInserted?.(suggestion);
    };

    // ---- Hover: what a name is, from the same candidates the suggestions use ----
    const hover = hoverTooltip(
      (view, pos, side) => {
        const doc = view.state.doc.toString();
        const { candidates, candidatesForBase, isStepKey, fieldTagLabel, describeValue, describeUnit, diagnostics, notes } = latest.current;
        const notesHere = (notes ?? []).filter((note) => note.from <= pos && (pos < note.to || (pos === note.to && side < 0)));
        // The problems under the pointer (the end of a range counts only from its left).
        const problems = (diagnostics ?? []).filter((d) => d.from <= pos && (pos < d.to || (pos === d.to && side < 0)));
        let found: AutocompleteSuggestion | undefined;
        const spans = [...problems, ...notesHere].map((entry) => ({ from: entry.from, to: entry.to }));
        const info = getWordAtCursor(doc, pos);
        if (info.word && !((pos === info.start && side < 0) || (pos === info.end && side > 0))) {
          const wanted = foldName(info.word);
          const pool = info.hasDot && info.baseWord && candidatesForBase ? [...candidates, ...candidatesForBase(info.baseWord)] : candidates;
          found = pool.find((candidate) => foldName(candidate.name) === wanted);
          if (found) spans.push({ from: info.start, to: info.end });
        }
        if (spans.length === 0) return null;
        const from = Math.min(...spans.map((span) => span.from));
        const to = Math.max(...spans.map((span) => span.to));
        const shown = found;
        return {
          pos: from,
          end: to,
          above: true,
          create: () => {
            const dom = document.createElement('div');
            if (shown) dom.append(renderHover(shown, isStepKey, fieldTagLabel, describeValue?.(shown.name), describeUnit?.(shown.name)));
            for (const note of notesHere) {
              const line = document.createElement('div');
              line.className = 'w-max max-w-[320px] px-3 py-2 font-numeric text-[11.5px] text-ink-muted [overflow-wrap:anywhere]';
              line.textContent = note.text;
              dom.append(line);
            }
            if (problems.length > 0) dom.append(renderProblems(view, problems, !!shown || notesHere.length > 0));
            return { dom };
          },
        };
      },
      // An edit changes what's under the pointer: the card is closed rather than left saying what it did.
      { hoverTime: 300, hideOnChange: true }
    );

    // ---- Signature: while the caret is inside a call's brackets, what the call takes and which argument it's on ----
    const signatureField = StateField.define<Tooltip | null>({
      create: (state) => signatureTooltip(state),
      update: (value, tr) => (tr.docChanged || tr.selection ? signatureTooltip(tr.state) : value),
      provide: (field) => showTooltip.from(field),
    });
    function signatureTooltip(state: EditorState): Tooltip | null {
      // A selected placeholder counts too: its start is inside the call.
      const at = callAtCaret(state.doc.toString(), state.selection.main.from);
      if (!at) return null;
      const signature = (latest.current.signatureFor ?? ((name: string) => callSignature(name, NO_FUNCTIONS)))(at.name);
      if (!signature) return null;
      const { argIndex } = at;
      return { pos: at.nameStart, above: true, arrow: false, create: () => ({ dom: renderSignature(signature, argIndex) }) };
    }

    const extensions: Extension[] = [
      invalidCompartment.of(invalidAttributes(latest.current.invalid)),
      inputsField,
      decorationsField,
      EditorState.allowMultipleSelections.of(true),
      drawSelection(),
      history(),
      closeBrackets(),
      bracketMatching(),
      hover,
      signatureField,
      Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
      keymap.of([{ key: 'Mod-d', run: selectNextOccurrence, preventDefault: true }, ...closeBracketsKeymap, ...historyKeymap, ...defaultKeymap]),
      autocompletion({
        override: [completionSource],
        icons: false,
        activateOnTyping: true,
        addToOptions: [
          {
            render: (completion) => renderSuggestionRow(completion, recent.current, latest.current.isStepKey, latest.current.fieldTagLabel),
            position: 20,
          },
        ],
      }),
      EditorView.lineWrapping,
      placeholder(latest.current.placeholderText),
      formulaTheme,
      EditorView.contentAttributes.of({
        'aria-label': latest.current.ariaLabel ?? 'Formula',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      }),
      EditorView.domEventHandlers({
        focus: () => {
          latest.current.onFocusChange?.(true);
        },
        blur: (event, view) => {
          latest.current.onFocusChange?.(false);
          // Tabbing into the palette: leave the text as it is, so the selection still points at what it did.
          if ((event.relatedTarget as HTMLElement | null)?.closest?.('[role="toolbar"]')) return;
          if (!latest.current.tidyOnBlur) return;
          setTimeout(() => {
            if (view.hasFocus || (latest.current.canTidy && !latest.current.canTidy())) return;
            const before = view.state.doc.toString();
            const tidied = prettifyFormula(before);
            if (tidied !== before) tidy(view, tidied, false);
          }, 300);
        },
      }),
      EditorView.updateListener.of((update) => {
        const current = latest.current;
        if (update.docChanged && !update.transactions.some((tr) => tr.annotation(External))) {
          current.onChange(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          const { from, to } = update.state.selection.main;
          current.onSelectionChange?.(from !== to ? { from, to } : null);
        }
        const open = completionStatus(update.state) === 'active';
        if (open !== lastOpen) {
          lastOpen = open;
          current.onCompletionOpenChange?.(open);
        }
      }),
    ];
    let lastOpen = false;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({ doc: latest.current.value, extensions }),
    });
    viewRef.current = view;

    // The formula replaced by its tidied version: one undo step, the caret kept by the same characters.
    const tidy = (view: EditorView, tidied: string, focus: boolean) => {
      const before = view.state.doc.toString();
      const caret = caretAfterTidy(before, view.state.selection.main.head, tidied);
      view.dispatch({
        changes: minimalChange(before, tidied),
        selection: { anchor: caret },
        userEvent: 'input.tidy',
        annotations: isolateHistory.of('full'),
      });
      if (focus) view.focus();
    };

    // ---- What the palette and the tidy line drive ----
    const run = (result: { value: string; cursorPosition: number }, from: number, to: number) => {
      // The helpers return the whole new text; the change is what lands between the two ends.
      const after = view.state.doc.sliceString(to);
      const insert = result.value.slice(from, result.value.length - after.length);
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: result.cursorPosition }, userEvent: 'input.palette' });
      view.focus();
    };
    latest.current.handleRef.current = {
      focus: () => view.focus(),
      hasFocus: () => view.hasFocus,
      getSelection: () => ({ from: view.state.selection.main.from, to: view.state.selection.main.to }),
      setSelection: (from, to) => view.dispatch({ selection: { anchor: from, head: to } }),
      insertToken: (name) => {
        const { from, to } = view.state.selection.main;
        run(getFormulaWithInsertedToken({ currentValue: view.state.doc.toString(), start: from, end: to, token: name }), from, to);
      },
      insertOperator: (operator) => {
        const { from, to } = view.state.selection.main;
        run(getFormulaWithInsertedOperator({ currentValue: view.state.doc.toString(), start: from, end: to, operator }), from, to);
      },
      applyTidy: (tidied, focus = true) => tidy(view, tidied, focus),
    };

    return () => {
      view.destroy();
      viewRef.current = null;
      latest.current.handleRef.current = null;
    };
    // The editor is created once; everything it reads from props goes through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The text, when it changed from outside (a rename on "Reuse", a bulk action): the smallest change, kept out of undo.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === props.value) return;
    view.dispatch({
      changes: minimalChange(current, props.value),
      annotations: [External.of(true), Transaction.addToHistory.of(false)],
    });
  }, [props.value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: invalidCompartment.reconfigure(invalidAttributes(props.invalid)) });
  }, [props.invalid, invalidCompartment]);

  // Colouring and the underlines follow what the card knows. Hosts hand over a new diagnostics array on every
  // render, so it's what the underlines draw from (ranges, levels) that's compared, not the array. The fixes
  // on a diagnostic aren't drawn, and the hover card reads them fresh from the latest props.
  const underlines = JSON.stringify((props.diagnostics ?? []).map((d) => [d.from, d.to, d.level]));
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setInputs.of({ names: props.names, diagnostics: latest.current.diagnostics }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.names, underlines, props.value]);

  return (
    <div
      ref={hostRef}
      className={`font-numeric text-ink ${props.className ?? ''}`}
      style={{ fontSize: props.fontSize, lineHeight: props.lineHeight ?? 1.5 }}
    />
  );
}
