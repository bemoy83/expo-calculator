'use client';

// The formula editor both the function editor and the calculator builder's step editor use:
// CodeMirror 6 with names coloured by decorations on the real text, suggestions through
// CodeMirror's list (ranked by lib/formula/suggestions), and the palette and the tidy as
// transactions, so each is one undo step and the caret and selection stay put.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Compartment, EditorState, StateEffect, StateField, Transaction, Annotation, Prec, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, closeHoverTooltips, drawSelection, hoverTooltip, keymap, placeholder, showTooltip, type DecorationSet, type Tooltip } from '@codemirror/view';
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
import { classifyFormula, type FormulaNames } from '@/lib/calculator/formula-tokens';
import { ISSUE_LEVELS } from '@/components/formula/IssueMarker';
import type { FormulaDiagnostic, FormulaNote } from '@/lib/formula/issue-levels';
import { UNRESOLVED, WAVY_UNDERLINE, TOKEN_TEXT, suggestionToken } from '@/components/formula/FormulaText';
import { filterSuggestions, getWordAtCursor, type AutocompleteSuggestion } from '@/lib/formula/suggestions';
import { getFormulaWithInsertedOperator, getFormulaWithInsertedToken } from '@/lib/functions/function-editor-helpers';
import { caretAfterTidy, prettifyFormula } from '@/lib/formula/prettify';
import { callSignature, parseCalls, paramAt, type CallSignature } from '@/lib/calculator/call-context';
import { displayUnit } from '@/lib/calculator/format';
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
  /** The position in the text nearest a point on screen, or null when the point is nowhere near the editor (for dropping a palette chip) */
  posAtPoint(x: number, y: number): number | null;
  /** A caret drawn at `pos` to show where a dragged chip would land; null clears it */
  showDropCaret(pos: number | null): void;
  /** Inserts what the palette's `kind` button inserts, at `pos`, with the spacing a click would give */
  insertAt(pos: number, kind: 'token' | 'operator', value: string): void;
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

// ---- Colouring: decorations on the real text, from the same classifier the rest of the app uses ----

interface DecorationInputs {
  names?: FormulaNames;
  diagnostics?: FormulaDiagnostic[];
}
const setInputs = StateEffect.define<DecorationInputs>();
const inputsField = StateField.define<DecorationInputs>({
  create: () => ({}),
  update(inputs, tr) {
    for (const effect of tr.effects) if (effect.is(setInputs)) return effect.value;
    return inputs;
  },
});

// A heads-up is a quieter dotted line; a broken formula is red and wavy; an unresolved name already has its amber dots from the colouring.
const HEADS_UP_UNDERLINE = 'underline decoration-dotted decoration-ink-muted underline-offset-[5px]';

function buildDecorations(text: string, { names, diagnostics }: DecorationInputs): DecorationSet {
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
  for (const diagnostic of diagnostics ?? []) {
    if (diagnostic.to <= diagnostic.from || diagnostic.to > text.length) continue;
    if (diagnostic.level === 'broken') {
      ranges.push(Decoration.mark({ class: `${WAVY_UNDERLINE} decoration-danger` }).range(diagnostic.from, diagnostic.to));
    } else if (diagnostic.level === 'heads-up') {
      ranges.push(Decoration.mark({ class: HEADS_UP_UNDERLINE }).range(diagnostic.from, diagnostic.to));
    }
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

// ---- Drop caret: where a chip dragged from the palette would land ----

const setDropCaret = StateEffect.define<number | null>();
class DropCaretWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-dropCaret';
    return el;
  }
  eq() {
    return true;
  }
}
const dropCaretField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDropCaret)) {
        return effect.value === null ? Decoration.none : Decoration.set([Decoration.widget({ widget: new DropCaretWidget(), side: 0 }).range(Math.min(effect.value, tr.state.doc.length))]);
      }
    }
    return tr.docChanged ? Decoration.none : value;
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
  // The editor draws the selection itself (more than one can be selected); tinted like the textarea's was.
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: 'rgb(var(--accent) / 0.3)' },
  '.cm-placeholder': { color: 'rgb(var(--ink-faint))' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'rgb(var(--accent))' },
  '.cm-dropCaret': { display: 'inline-block', height: '1.15em', borderLeft: '2px solid rgb(var(--accent))', margin: '0 -2px 0 -1px', verticalAlign: 'text-bottom', pointerEvents: 'none' },
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
function renderHover(suggestion: AutocompleteSuggestion, isStepKey?: (name: string) => boolean, fieldTagLabel?: string, value?: string, unit?: string): HTMLElement {
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
  if (unit) card.append(make('span', 'text-[11.5px] text-ink-muted', `Measured in ${unit}`));
  if (value) card.append(make('span', 'font-numeric text-[11.5px] text-ink', `Now ${value}`));
  return card;
}

/** The problems under the pointer: each one's marker and message, then the buttons that fix it. */
function renderProblems(view: EditorView, problems: FormulaDiagnostic[], withDivider: boolean): HTMLElement {
  const list = document.createElement('div');
  list.className = `flex max-w-[320px] flex-col gap-2 px-3 py-2 ${withDivider ? 'border-t border-border-strong' : ''}`;
  for (const problem of problems) {
    const level = ISSUE_LEVELS[problem.level];
    const row = document.createElement('div');
    row.className = 'flex flex-col gap-1';
    const message = document.createElement('p');
    message.className = `text-[11.5px] ${level.text}`;
    message.textContent = `${level.glyph} ${problem.message}`;
    message.title = level.label;
    row.append(message);
    if (problem.fixes?.length) {
      const buttons = document.createElement('div');
      buttons.className = 'flex flex-wrap gap-1.5';
      for (const fix of problem.fixes) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rounded-md border border-border-strong px-2 py-0.5 text-[11.5px] text-ink hover:bg-sunken-2';
        button.textContent = fix.label;
        if (fix.title) button.title = fix.title;
        // Keep the editor's focus and caret; the fix may change the formula under them.
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => {
          view.dispatch({ effects: closeHoverTooltips });
          fix.run();
        });
        buttons.append(button);
      }
      row.append(buttons);
    }
    list.append(row);
  }
  return list;
}

const NO_FUNCTIONS = { functions: [] };

/** The innermost call the caret is inside, and the argument it's on. */
function callAtCaret(doc: string, caret: number) {
  let found: { name: string; nameStart: number; argIndex: number } | null = null;
  let openAt = -1;
  for (const call of parseCalls(doc)) {
    if (caret <= call.open || (call.close !== undefined && caret > call.close) || call.open < openAt) continue;
    openAt = call.open;
    const next = call.args.findIndex((arg) => caret <= arg.end);
    found = { name: call.name, nameStart: call.nameStart, argIndex: next === -1 ? call.args.length - 1 : next };
  }
  return found;
}

const KIND_NOTE: Record<string, string> = { material: 'a material', labor: 'a labor rate', boolean: 'yes or no' };

/** The call as it's written with the argument being typed in bold, and what that argument expects under it. */
function renderSignature(signature: CallSignature, argIndex: number): HTMLElement {
  const make = (tag: string, className: string, text: string) => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };
  const active = paramAt(signature, argIndex);
  const card = document.createElement('div');
  card.className = 'flex max-w-[320px] flex-col gap-0.5 px-3 py-2';
  const line = make('code', 'text-xs font-numeric text-ink-muted', '');
  line.append(`${signature.name}(`);
  signature.params.forEach((param, i) => {
    if (i > 0) line.append(', ');
    const isActive = param === active;
    line.append(make('span', isActive ? 'font-semibold text-ink' : '', param.name + (signature.variadic && i === signature.params.length - 1 ? '…' : '')));
  });
  line.append(')');
  card.append(line);
  if (active) {
    const unit = displayUnit(active.unitSymbol);
    const note = KIND_NOTE[active.kind] ?? unit;
    const text = [active.label !== active.name ? active.label : '', note].filter(Boolean).join(' · ');
    if (text) card.append(make('span', 'text-[11.5px] text-ink-muted', text));
  } else {
    const count = signature.params.length;
    card.append(make('span', 'text-[11.5px] text-ink-muted', `Takes ${count} argument${count === 1 ? '' : 's'}`));
  }
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
              line.className = 'max-w-[320px] px-3 py-2 font-numeric text-[11.5px] text-ink-muted';
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
      dropCaretField,
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
      posAtPoint: (x, y) => {
        const box = view.dom.getBoundingClientRect();
        const slack = 24;
        if (x < box.left - slack || x > box.right + slack || y < box.top - slack || y > box.bottom + slack) return null;
        return view.posAtCoords({ x, y }, false);
      },
      showDropCaret: (pos) => view.dispatch({ effects: setDropCaret.of(pos) }),
      insertAt: (pos, kind, value) => {
        view.dispatch({ selection: { anchor: pos }, effects: setDropCaret.of(null) });
        if (kind === 'token') latest.current.handleRef.current?.insertToken(value);
        else latest.current.handleRef.current?.insertOperator(value);
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
    viewRef.current?.dispatch({ effects: setInputs.of({ names: props.names, diagnostics: props.diagnostics }) });
  }, [props.names, props.diagnostics, props.value]);

  return (
    <div
      ref={hostRef}
      className={`font-numeric text-ink ${props.className ?? ''}`}
      style={{ fontSize: props.fontSize, lineHeight: props.lineHeight ?? 1.5 }}
    />
  );
}
