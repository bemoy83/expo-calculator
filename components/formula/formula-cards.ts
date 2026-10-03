import { closeHoverTooltips, type EditorView } from '@codemirror/view';
import type { Completion } from '@codemirror/autocomplete';
import { ISSUE_LEVELS } from '@/components/formula/IssueMarker';
import { TOKEN_TEXT, suggestionToken } from '@/components/formula/FormulaText';
import type { AutocompleteSuggestion } from '@/lib/formula/suggestions';
import type { FormulaDiagnostic } from '@/lib/formula/issue-levels';
import { paramAt, type CallSignature } from '@/lib/calculator/call-context';
import { displayUnit } from '@/lib/calculator/format';

// The cards the formula editor draws as plain DOM (CodeMirror takes elements, not React): a suggestion's
// row in the list, the hover card for a name, the problems under the pointer, and the signature of the
// call the caret is in.

const make = (tag: string, className: string, text?: string) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/** What a kind tag says: "stored", the host's word for a field (a function's "parameter"), or the kind's own label. */
function kindTag(suggestion: AutocompleteSuggestion, token: ReturnType<typeof suggestionToken>, fieldTagLabel?: string): string {
  return suggestion.storedKey ? 'stored' : suggestion.type === 'field' && fieldTagLabel ? fieldTagLabel : token.label;
}

// The suggestion each list row stands for, so its row can be drawn the way the textarea version draws it.
export const suggestionOf = new WeakMap<Completion, AutocompleteSuggestion>();

/** One suggestion row: the name in its kind's colour, the description under it, the kind tag at the right. */
export function renderSuggestionRow(
  completion: Completion,
  recent: string[],
  isStepKey?: (name: string) => boolean,
  fieldTagLabel?: string
): Node | null {
  const suggestion = suggestionOf.get(completion);
  if (!suggestion) return null;
  const token = suggestionToken(suggestion.type, suggestion.type === 'field' && !!isStepKey?.(suggestion.name));
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
    make('span', `flex-none font-numeric text-[10.5px] uppercase tracking-wide font-medium ${TOKEN_TEXT[token.kind] || 'text-ink-faint'}`, kindTag(suggestion, token, fieldTagLabel))
  );
  return row;
}

/** The hover card for a name: how it's written (a call with its arguments), what it is, and its description. */
export function renderHover(suggestion: AutocompleteSuggestion, isStepKey?: (name: string) => boolean, fieldTagLabel?: string, value?: string, unit?: string): HTMLElement {
  const token = suggestionToken(suggestion.type, suggestion.type === 'field' && !!isStepKey?.(suggestion.name));
  const card = document.createElement('div');
  // A long name wraps inside the card (anywhere, since it has no spaces) instead of pushing the kind tag out of it.
  card.className = 'flex w-max max-w-[320px] flex-col gap-0.5 px-3 py-2 [overflow-wrap:anywhere]';
  const head = document.createElement('div');
  // The tag sits beside the name when there's room and drops under it when there isn't.
  head.className = 'flex flex-wrap items-baseline gap-x-3';
  head.append(
    make('code', `min-w-0 max-w-full text-xs font-numeric ${TOKEN_TEXT[token.kind]}`, suggestion.displayName),
    make('span', `flex-none font-numeric text-[10.5px] uppercase tracking-wide font-medium ${TOKEN_TEXT[token.kind] || 'text-ink-faint'}`, kindTag(suggestion, token, fieldTagLabel))
  );
  card.append(head);
  if (suggestion.description) card.append(make('span', 'text-[11.5px] text-ink-muted', suggestion.description));
  if (unit) card.append(make('span', 'text-[11.5px] text-ink-muted', `Measured in ${unit}`));
  if (value) card.append(make('span', 'font-numeric text-[11.5px] text-ink', `Now ${value}`));
  return card;
}

/** The problems under the pointer: each one's marker and message, then the buttons that fix it. */
export function renderProblems(view: EditorView, problems: FormulaDiagnostic[], withDivider: boolean): HTMLElement {
  const list = document.createElement('div');
  list.className = `flex w-max max-w-[320px] flex-col gap-2 px-3 py-2 [overflow-wrap:anywhere] ${withDivider ? 'border-t border-border-strong' : ''}`;
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

const KIND_NOTE: Record<string, string> = { material: 'a material', labor: 'a labor rate', boolean: 'yes or no' };

/** The call as it's written with the argument being typed in bold, and what that argument expects under it. */
export function renderSignature(signature: CallSignature, argIndex: number): HTMLElement {
  const active = paramAt(signature, argIndex);
  const card = document.createElement('div');
  card.className = 'flex w-max max-w-[320px] flex-col gap-0.5 px-3 py-2 [overflow-wrap:anywhere]';
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
