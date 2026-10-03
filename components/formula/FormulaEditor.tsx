'use client';

// The formula editor both the function editor and the calculator builder's step editor use:
// CodeMirror 6 with names coloured by decorations on the real text, suggestions through
// CodeMirror's list (ranked by lib/formula/suggestions), and the palette and the tidy as
// transactions, so each is one undo step and the caret and selection stay put.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Compartment, EditorState, StateEffect, StateField, Transaction, Annotation, Prec, type Extension } from '@codemirror/state';
import { Decoration, EditorView, hoverTooltip, keymap, placeholder, type DecorationSet } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
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
import { classifyFormula, type FormulaNames } from '@/lib/calculator/formula-tokens';
import { UNRESOLVED, WAVY_UNDERLINE, TOKEN_TEXT, suggestionToken } from '@/components/formula/FormulaText';
import { filterSuggestions, getWordAtCursor, type AutocompleteSuggestion } from '@/lib/formula/suggestions';
import { getFormulaWithInsertedOperator, getFormulaWithInsertedToken } from '@/lib/functions/function-editor-helpers';
import { caretAfterTidy, prettifyFormula } from '@/lib/formula/prettify';
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
  errorRange?: { start: number; end: number } | null;
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
  /** Tidy the spacing of a formula that reads fine once the editor is left (as one undo step). `canTidy` can hold it back. */
  tidyOnBlur?: boolean;
  canTidy?: () => boolean;
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
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: 'inherit', overflow: 'visible' },
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
function renderSuggestionRow(
  completion: Completion,
  recent: string[],
  isStepKey?: (name: string) => boolean,
  fieldTagLabel?: string
): Node | null {
  const suggestion = suggestionOf.get(completion);
  if (!suggestion) return null;
  const token = suggestionToken(suggestion.type, suggestion.type === 'field' && !!isStepKey?.(suggestion.name));
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
      suggestion.storedKey ? 'stored' : suggestion.type === 'field' && fieldTagLabel ? fieldTagLabel : token.label
    )
  );
  return row;
}

/** The hover card for a name: how it's written (a call with its arguments), what it is, and its description. */
function renderHover(suggestion: AutocompleteSuggestion, isStepKey?: (name: string) => boolean, fieldTagLabel?: string, value?: string): HTMLElement {
  const token = suggestionToken(suggestion.type, suggestion.type === 'field' && !!isStepKey?.(suggestion.name));
  const make = (tag: string, className: string, text: string) => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };
  const card = document.createElement('div');
  card.className = 'flex max-w-[280px] flex-col gap-0.5 px-3 py-2';
  const head = document.createElement('div');
  head.className = 'flex items-baseline gap-3';
  head.append(
    make('code', `flex-1 text-xs font-numeric ${TOKEN_TEXT[token.kind]}`, suggestion.displayName),
    make(
      'span',
      `flex-none font-numeric text-[10.5px] uppercase tracking-wide font-medium ${TOKEN_TEXT[token.kind] || 'text-ink-faint'}`,
      suggestion.storedKey ? 'stored' : suggestion.type === 'field' && fieldTagLabel ? fieldTagLabel : token.label
    )
  );
  card.append(head);
  if (suggestion.description) card.append(make('span', 'text-[11.5px] text-ink-muted', suggestion.description));
  if (value) card.append(make('span', 'font-numeric text-[11.5px] text-ink', `Now ${value}`));
  return card;
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
      // A call goes in as a snippet: each argument a stop to Tab through, the caret ending after the ")".
      const args =
        suggestion.type === 'function' && suggestion.functionSignature
          ? suggestion.functionSignature.split(',').map((arg) => arg.trim()).filter(Boolean)
          : null;
      let template = suggestion.name;
      if (args?.length) template = `${suggestion.name}(${args.map((arg, i) => `\${${i + 1}:${arg}}`).join(', ')})`;
      else if (suggestion.type === 'function' && suggestion.displayName.includes('()')) template = `${suggestion.name}(\${})`;
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
        const info = getWordAtCursor(doc, pos);
        if (!info.word || (pos === info.start && side < 0) || (pos === info.end && side > 0)) return null;
        const { candidates, candidatesForBase, isStepKey, fieldTagLabel, describeValue } = latest.current;
        const wanted = foldName(info.word);
        const pool = info.hasDot && info.baseWord && candidatesForBase ? [...candidates, ...candidatesForBase(info.baseWord)] : candidates;
        const found = pool.find((candidate) => foldName(candidate.name) === wanted);
        if (!found) return null;
        return {
          pos: info.start,
          end: info.end,
          above: true,
          create: () => ({ dom: renderHover(found, isStepKey, fieldTagLabel, describeValue?.(found.name)) }),
        };
      },
      { hoverTime: 300 }
    );

    const extensions: Extension[] = [
      invalidCompartment.of(invalidAttributes(latest.current.invalid)),
      inputsField,
      decorationsField,
      history(),
      closeBrackets(),
      bracketMatching(),
      hover,
      Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
      keymap.of([...closeBracketsKeymap, ...historyKeymap, ...defaultKeymap]),
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
      theme,
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

  // Colouring and the error underline follow what the card knows.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setInputs.of({ names: props.names, errorRange: props.errorRange }) });
  }, [props.names, props.errorRange, props.value]);

  return (
    <div
      ref={hostRef}
      className={`font-numeric text-ink ${props.className ?? ''}`}
      style={{ fontSize: props.fontSize, lineHeight: props.lineHeight ?? 1.5 }}
    />
  );
}
