import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { classifyFormula, type FormulaNames } from '@/lib/calculator/formula-tokens';
import type { FormulaDiagnostic } from '@/lib/formula/issue-levels';
import { UNRESOLVED, WAVY_UNDERLINE, TOKEN_TEXT } from '@/components/formula/FormulaText';

// ---- Colouring: decorations on the real text, from the same classifier the rest of the app uses ----

export interface DecorationInputs {
  names?: FormulaNames;
  diagnostics?: FormulaDiagnostic[];
}
export const setInputs = StateEffect.define<DecorationInputs>();
export const inputsField = StateField.define<DecorationInputs>({
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

export const decorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    if (!tr.docChanged && !tr.effects.some((effect) => effect.is(setInputs))) return decorations;
    return buildDecorations(tr.state.doc.toString(), tr.state.field(inputsField));
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ---- Look: the same type, colours and caret as the textarea version ----

export const formulaTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'rgb(var(--ink))' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: 'inherit', overflow: 'visible' },
  '.cm-content': { padding: '0', caretColor: 'rgb(var(--accent))', fontFamily: 'inherit' },
  '.cm-line': { padding: '0' },
  // The editor draws the selection itself (more than one can be selected); tinted like the textarea's was.
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: 'rgb(var(--accent) / 0.3)' },
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
