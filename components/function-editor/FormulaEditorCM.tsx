'use client';

// SPIKE: the function editor's formula surface on CodeMirror 6 instead of a textarea with a
// coloured copy drawn behind it. Same props the card already has, plus an imperative handle for
// the palette. What it replaces: the overlay (names are coloured by decorations on the real
// text), the caret-mirror popup (CodeMirror positions its own tooltip), and the execCommand tidy
// (a transaction, one undo step, caret mapped).

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Compartment, EditorState, StateEffect, StateField, Transaction, Annotation, Prec, type Extension } from '@codemirror/state';
import { Decoration, EditorView, keymap, placeholder, type DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, isolateHistory } from '@codemirror/commands';
import {
  acceptCompletion,
  autocompletion,
  completionStatus,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { classifyFormula, type FormulaNames } from '@/lib/calculator/formula-tokens';
import { UNRESOLVED, WAVY_UNDERLINE, TOKEN_TEXT, suggestionToken } from '@/components/formula/FormulaText';
import { filterSuggestions, getWordAtCursor, type AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';
import { getFormulaWithInsertedOperator, getFormulaWithInsertedToken } from '@/lib/functions/function-editor-helpers';
import { caretAfterTidy } from '@/lib/formula/prettify';
import { isNameChar } from '@/lib/formula/identifiers';

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
  errorRange?: { start: number; end: number } | null;
  fontSize: number;
  placeholderText: string;
  invalid?: boolean;
  candidates: AutocompleteSuggestion[];
  candidatesForBase?: (base: string) => AutocompleteSuggestion[];
  onSuggestionInserted?: (suggestion: AutocompleteSuggestion) => void;
  onSelectionChange?: (selection: { from: number; to: number } | null) => void;
  onFocusChange?: (focused: boolean, relatedTarget: EventTarget | null) => void;
  onCompletionOpenChange?: (open: boolean) => void;
  handleRef: MutableRefObject<FormulaEditorHandle | null>;
}

// ---- Colouring: decorations on the real text, from the same classifier the rest of the app uses ----

interface DecorationInputs {
  names?: FormulaNames;
  errorRange?: { start: number; end: number } | null;
}
const setInputs = StateEffect.define<DecorationInputs>();
const inputsField = StateField.define<DecorationInputs>({
  create: () => ({}),
  update(inputs, tr) {
    for (const effect of tr.effects) if (effect.is(setInputs)) return effect.value;
    return inputs;
  },
});

function buildDecorations(text: string, { names, errorRange }: DecorationInputs): DecorationSet {
  const ranges = [];
  if (names) {
    let offset = 0;
    for (const segment of classifyFormula(text, names)) {
      const from = offset;
      offset += segment.text.length;
      if (segment.kind === 'plain') continue;
      // A name nothing matches is unresolved (amber, dotted), as in the textarea version.
      const className = segment.kind === 'unknown' ? UNRESOLVED : TOKEN_TEXT[segment.kind];
      if (className) ranges.push(Decoration.mark({ class: className }).range(from, offset));
    }
  }
  if (errorRange && errorRange.end > errorRange.start && errorRange.end <= text.length) {
    ranges.push(Decoration.mark({ class: `${WAVY_UNDERLINE} decoration-danger` }).range(errorRange.start, errorRange.end));
  }
  return Decoration.set(ranges, true);
}

const decorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    if (!tr.docChanged && !tr.effects.some((effect) => effect.is(setInputs))) return decorations;
    return buildDecorations(tr.state.doc.toString(), tr.state.field(inputsField));
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ---- Look: the same type, colours and caret as the textarea version ----

const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'rgb(var(--ink))' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.5', overflow: 'visible' },
  '.cm-content': { padding: '0', caretColor: 'rgb(var(--accent))', fontFamily: 'inherit' },
  '.cm-line': { padding: '0' },
  // The browser draws the selection; tinted like the textarea's.
  '& .cm-line::selection, & .cm-line ::selection': { backgroundColor: 'rgb(var(--accent) / 0.3)' },
  '.cm-placeholder': { color: 'rgb(var(--ink-faint))' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'rgb(var(--accent))' },
  '.cm-tooltip': {
    backgroundColor: 'rgb(var(--surface))',
    color: 'rgb(var(--ink))',
    border: '1px solid rgb(var(--border-strong))',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'inherit', maxHeight: '16rem', minWidth: '280px' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '12px', lineHeight: '1.3' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent-soft)', color: 'rgb(var(--ink))' },
  // The row is drawn by renderSuggestionRow; the default label is only what the list matches on.
  '.cm-completionLabel, .cm-completionDetail, .cm-completionMatchedText': { display: 'none' },
});

const External = Annotation.define<boolean>();

// aria-invalid belongs on the textbox itself (the editor's content), which changes as the formula does.
const invalidAttributes = (invalid?: boolean) => EditorView.contentAttributes.of(invalid ? { 'aria-invalid': 'true' } : {});

// The suggestion each list row stands for, so its row can be drawn the way the textarea version draws it.
const suggestionOf = new WeakMap<Completion, AutocompleteSuggestion>();

/** One suggestion row: the name in its kind's colour, the description under it, the kind tag at the right. */
function renderSuggestionRow(completion: Completion, recent: string[]): Node | null {
  const suggestion = suggestionOf.get(completion);
  if (!suggestion) return null;
  const token = suggestionToken(suggestion.type);
  const make = (tag: string, className: string, text?: string) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const row = make('div', 'flex flex-1 min-w-0 items-center gap-3');
  const left = make('span', 'flex flex-1 min-w-0 flex-col');
  left.append(make('code', `text-xs font-numeric ${TOKEN_TEXT[token.kind]}`, suggestion.displayName));
  if (suggestion.description) left.append(make('span', 'text-[11.5px] text-ink-muted truncate', suggestion.description));
  row.append(left);
  if (recent.includes(suggestion.name)) {
    const dot = make('span', 'text-xs text-ink-faint', '●');
    dot.title = 'Recently used';
    row.append(dot);
  }
  row.append(
    make(
      'span',
      `flex-none font-numeric text-[10.5px] uppercase tracking-wide font-medium ${TOKEN_TEXT[token.kind] || 'text-ink-faint'}`,
      suggestion.storedKey ? 'stored' : suggestion.type === 'field' ? 'parameter' : token.label
    )
  );
  return row;
}

/** The smallest single change turning `from` into `to`, so a rename in the middle keeps the caret where it was. */
function minimalChange(from: string, to: string) {
  let start = 0;
  const max = Math.min(from.length, to.length);
  while (start < max && from[start] === to[start]) start += 1;
  let endFrom = from.length;
  let endTo = to.length;
  while (endFrom > start && endTo > start && from[endFrom - 1] === to[endTo - 1]) {
    endFrom -= 1;
    endTo -= 1;
  }
  return { from: start, to: endFrom, insert: to.slice(start, endTo) };
}

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
      let toInsert = suggestion.name;
      if (suggestion.type === 'function' && suggestion.functionSignature) toInsert = `${suggestion.name}(${suggestion.functionSignature})`;
      else if (suggestion.type === 'function' && suggestion.displayName.includes('()')) toInsert = suggestion.displayName;
      const charBefore = from > 0 ? doc[from - 1] : '';
      const spaceBefore = from > 0 && charBefore !== ' ' && charBefore !== '\t' && !/[+\-*/(]/.test(charBefore) ? ' ' : '';
      const charAfter = end < doc.length ? doc[end] : '';
      const spaceAfter = end < doc.length && charAfter !== ' ' && charAfter !== '\t' && !/[+\-*/)]/.test(charAfter) ? ' ' : '';
      const inserted = `${spaceBefore}${toInsert}${spaceAfter}`;
      let cursor = from + inserted.length;
      if (suggestion.type === 'function' && suggestion.functionSignature) cursor = from + inserted.indexOf('(') + 1;
      view.dispatch({ changes: { from, to: end, insert: inserted }, selection: { anchor: cursor }, userEvent: 'input.complete' });
      recent.current = [suggestion.name, ...recent.current.filter((name) => name !== suggestion.name)].slice(0, 15);
      latest.current.onSuggestionInserted?.(suggestion);
    };

    const extensions: Extension[] = [
      invalidCompartment.of(invalidAttributes(latest.current.invalid)),
      inputsField,
      decorationsField,
      history(),
      Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
      keymap.of([...historyKeymap, ...defaultKeymap]),
      autocompletion({
        override: [completionSource],
        icons: false,
        activateOnTyping: true,
        addToOptions: [{ render: (completion) => renderSuggestionRow(completion, recent.current), position: 20 }],
      }),
      EditorView.lineWrapping,
      placeholder(latest.current.placeholderText),
      theme,
      EditorView.contentAttributes.of({
        'aria-label': 'Formula',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      }),
      EditorView.domEventHandlers({
        focus: () => {
          latest.current.onFocusChange?.(true, null);
        },
        blur: (event) => {
          latest.current.onFocusChange?.(false, (event as FocusEvent).relatedTarget);
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

    // ---- What the card's palette and tidy line drive ----
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
      applyTidy: (tidied, focus = true) => {
        const before = view.state.doc.toString();
        const caret = caretAfterTidy(before, view.state.selection.main.head, tidied);
        view.dispatch({
          changes: minimalChange(before, tidied),
          selection: { anchor: caret },
          userEvent: 'input.tidy',
          annotations: isolateHistory.of('full'),
        });
        if (focus) view.focus();
      },
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

  // Colouring and the error underline follow what the card knows.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setInputs.of({ names: props.names, errorRange: props.errorRange }) });
  }, [props.names, props.errorRange, props.value]);

  return <div ref={hostRef} className="font-numeric text-ink" style={{ fontSize: props.fontSize }} />;
}
