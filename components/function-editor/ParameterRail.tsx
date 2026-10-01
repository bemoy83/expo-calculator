'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { DashedAdd } from '@/components/ui/DashedAdd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { FunctionParameter } from '@/hooks/use-parameter-manager';
import { countParameterUses } from '@/lib/functions/function-usage';
import { getFunctionParamKinds } from '@/lib/functions/param-kinds';
import type { FunctionParamKind } from '@/lib/types';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import { cn } from '@/lib/utils';

const KIND_OPTIONS: Array<{ value: FunctionParamKind | ''; label: string }> = [
  { value: '', label: 'Automatic' },
  { value: 'number', label: 'Number' },
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'boolean', label: 'Yes/no' },
];

const KIND_NAME: Record<FunctionParamKind, string> = {
  number: 'number',
  material: 'material',
  labor: 'labor',
  boolean: 'yes/no',
};

interface ParameterRailProps {
  parameters: FunctionParameter[];
  /** Categories of the catalog's materials, for limiting a material parameter's suggestions */
  materialCategories: string[];
  formula: string;
  /** The parameter open for editing */
  openIndex: number | null;
  onToggle: (index: number) => void;
  onUpdate: (index: number, updates: Partial<FunctionParameter>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onAdd: () => void;
  errors: Record<number, Record<string, string>>;
  /** From other functions and calculator inputs */
  suggestions: FunctionParameter[];
  /** Lower-cased names already used, so a suggestion shows as added */
  existingNames: Set<string>;
  onReuse: (suggestion: FunctionParameter) => void;
  /** A parameter just added opens with its Label field focused, ready to type. */
  focusLabelOf: number | null;
  onLabelFocused: () => void;
}

// The function's parameters as flat rows in the editor's rail (mockup 2a): the name in teal,
// its unit or kind on the right, and "not used" when the formula doesn't read it. A row opens
// in place to edit it; the order is the order calls pass values in.
export function ParameterRail({
  parameters,
  materialCategories,
  formula,
  openIndex,
  onToggle,
  onUpdate,
  onRemove,
  onMove,
  onAdd,
  errors,
  suggestions,
  existingNames,
  onReuse,
  focusLabelOf,
  onLabelFocused,
}: ParameterRailProps) {
  const [reuseOpen, setReuseOpen] = useState(false);
  // Renaming is a deliberate step: ✎ turns the name into an input; Enter or leaving saves, Esc cancels.
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  // Set once Enter or Esc has finished a rename, so the blur that follows doesn't finish it again.
  const finished = useRef(false);
  const startRename = (index: number) => {
    finished.current = false;
    setDraftName(parameters[index].name);
    setRenaming(index);
  };
  const finishRename = (index: number, keep: boolean) => {
    if (renaming !== index || finished.current) return;
    finished.current = true;
    const next = draftName.trim();
    if (keep && next !== parameters[index].name) onUpdate(index, { name: next });
    setRenaming(null);
  };
  // What each parameter is taken to be when no kind is chosen.
  const inferred = getFunctionParamKinds({
    formula,
    parameters: parameters.map((parameter) => ({ ...parameter, kind: undefined })),
  });

  return (
    <section aria-labelledby="parameters-heading" className="flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline px-2.5 pb-2">
        <Eyebrow as="h2" id="parameters-heading">
          Parameters · {parameters.length}
        </Eyebrow>
        <button
          type="button"
          onClick={() => {
            setRenaming(null);
            onAdd();
          }}
          aria-label="Add parameter"
          className="font-numeric text-xs tracking-[.06em] text-ink hover:text-ink-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          + New
        </button>
      </div>

      {parameters.length === 0 && (
        <p className="px-2.5 pb-2 text-xs text-ink-muted">
          Parameters are the values a call passes in, in order. Each one is a name the formula can use.
        </p>
      )}

      {parameters.map((parameter, index) => {
        const name = parameter.name.trim();
        const uses = countParameterUses(formula, name);
        const kind = parameter.kind ?? inferred[name] ?? 'number';
        const detail = kind === 'number' ? parameter.unitSymbol || 'number' : KIND_NAME[kind];
        const label = parameter.label || name || `Parameter ${index + 1}`;

        if (index !== openIndex) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                setRenaming(null);
                onToggle(index);
              }}
              aria-expanded={false}
              aria-label={`${label}${uses === 0 && name ? ', not used by the formula' : ''}. Edit`}
              className={cn(
                'flex justify-between gap-2 px-2.5 py-[7px] rounded-md border border-transparent text-[13px] text-left',
                'transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action'
              )}
            >
              <span className={cn('font-numeric truncate', name && uses > 0 ? 'text-token-input' : 'text-ink-muted')}>
                {name || 'unnamed'}
              </span>
              <span className={cn('shrink-0 text-xs text-ink-faint', uses > 0 && 'font-numeric')}>
                {uses > 0 ? detail : 'not used'}
              </span>
            </button>
          );
        }

        const error = errors[index] ?? {};
        return (
          <div
            key={index}
            className="my-1 rounded-row border border-accent shadow-focus bg-surface"
            role="group"
            aria-label={`Parameter ${index + 1}`}
          >
            {/* The top line opens and closes the row, like a closed row; ✎ renames in place. */}
            <div className="flex items-center gap-1 pr-1">
              {renaming === index ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      finishRename(index, true);
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      finishRename(index, false);
                    }
                  }}
                  onBlur={() => finishRename(index, true)}
                  aria-label="Name in the formula"
                  aria-describedby={uses > 0 ? `param-${index}-rename-note` : undefined}
                  placeholder="name"
                  className="flex-1 min-w-0 ml-2.5 my-1 h-7 bg-transparent border-b border-accent font-numeric text-[13px] text-token-input placeholder:text-ink-faint focus:outline-none"
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onToggle(index)}
                    aria-expanded
                    aria-label={`${label}. Close`}
                    className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-2.5 pr-1 py-2 rounded-row text-[13px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  >
                    <span className={cn('font-numeric truncate', name ? 'text-token-input' : 'text-ink-faint')}>
                      {name || 'unnamed'}
                    </span>
                    <span className="shrink-0 font-numeric text-xs text-ink-faint">{detail}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(index)}
                    aria-label={`Rename ${label}`}
                    title="Rename"
                    className="p-1 rounded text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            {renaming === index && uses > 0 && (
              <p id={`param-${index}-rename-note`} className="px-2.5 text-[11px] text-draft">
                Used {uses}× in the formula — renaming breaks it.
              </p>
            )}
            {error.name && <p className="px-2.5 text-xs text-danger">{error.name}</p>}

            <div className="flex flex-col gap-2 px-2.5 pt-1.5 pb-3">
              <Input
                label="Label"
                size="compact"
                autoFocus={focusLabelOf === index}
                onFocus={onLabelFocused}
                value={parameter.label}
                placeholder="e.g. Width"
                error={error.label}
                onChange={(event) => onUpdate(index, { label: event.target.value })}
              />
              <div className={cn('grid gap-2', kind === 'number' ? 'grid-cols-[minmax(0,1fr)_68px]' : 'grid-cols-1')}>
                <Select
                  label="Expects"
                  size="compact"
                  value={parameter.kind ?? ''}
                  options={KIND_OPTIONS}
                  onChange={(event) => {
                    const next = (event.target.value || undefined) as FunctionParamKind | undefined;
                    onUpdate(
                      index,
                      next && next !== 'number'
                        ? { kind: next, unitSymbol: undefined, unitCategory: undefined, materialCategory: next === 'material' ? parameter.materialCategory : undefined }
                        : { kind: next, materialCategory: undefined }
                    );
                  }}
                />
                {kind === 'number' && (
                  <Select
                    label="Unit"
                    size="compact"
                    className="font-numeric pr-6"
                    value={parameter.unitSymbol ?? ''}
                    options={[{ value: '', label: '—' }, ...getAllUnitSymbols().map((symbol) => ({ value: symbol, label: symbol }))]}
                    onChange={(event) =>
                      onUpdate(index, {
                        unitSymbol: event.target.value || undefined,
                        unitCategory: event.target.value ? getUnitCategory(event.target.value) : undefined,
                      })
                    }
                  />
                )}
              </div>
              {(parameter.kind ?? inferred[name]) === 'material' && (
                <Select
                  label="Category"
                  size="compact"
                  value={parameter.materialCategory ?? ''}
                  options={[
                    { value: '', label: 'Any category' },
                    ...(parameter.materialCategory && !materialCategories.includes(parameter.materialCategory)
                      ? [{ value: parameter.materialCategory, label: parameter.materialCategory }]
                      : []),
                    ...materialCategories.map((category) => ({ value: category, label: category })),
                  ]}
                  onChange={(event) => onUpdate(index, { materialCategory: event.target.value || undefined })}
                />
              )}
              {(parameter.kind ?? inferred[name]) === 'material' && (
                <p className="text-[11px] text-ink-faint">
                  {parameter.materialCategory
                    ? `After “${name}.” the editor suggests properties of ${parameter.materialCategory} materials.`
                    : `After “${name}.” the editor suggests properties of any material.`}
                </p>
              )}
              {!parameter.kind && name && (
                <p className="text-[11px] text-ink-faint">Worked out from the formula: {KIND_NAME[inferred[name] ?? 'number']}</p>
              )}
              <div className="flex items-center gap-1 pt-0.5 text-xs">
                <span className="text-ink-muted">{uses === 0 ? 'Not used' : `Used ${uses}×`}</span>
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${label} up`}
                  className="ml-1 p-1 rounded text-ink-muted hover:text-ink disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === parameters.length - 1}
                  aria-label={`Move ${label} down`}
                  className="p-1 rounded text-ink-muted hover:text-ink disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-danger rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <DashedAdd onClick={() => setReuseOpen((open) => !open)} className="mt-1.5 p-[9px]">
        Reuse a parameter {reuseOpen ? '▴' : '▾'}
      </DashedAdd>
      {reuseOpen && (
        <div className="mt-1 flex flex-col gap-0.5" role="group" aria-label="Parameters to reuse">
          {suggestions.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-ink-muted">
              Nothing to reuse yet. Parameters of your other functions, and calculator inputs, show here.
            </p>
          ) : (
            suggestions.map((suggestion) => {
              const added = existingNames.has(suggestion.name.toLowerCase());
              const detail =
                suggestion.kind && suggestion.kind !== 'number' ? KIND_NAME[suggestion.kind] : suggestion.unitSymbol;
              return (
                <button
                  key={`${suggestion.name}|${suggestion.kind ?? ''}|${suggestion.unitSymbol ?? ''}`}
                  type="button"
                  onClick={() => onReuse(suggestion)}
                  disabled={added}
                  title={suggestion.label}
                  aria-label={added ? `${suggestion.name} is already a parameter` : `Add ${suggestion.name} as a parameter`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-left enabled:hover:bg-surface-hover disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  {added ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-token-input" aria-hidden="true" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                  )}
                  <span className={cn('font-numeric truncate', added ? 'text-ink-muted' : 'text-token-input')}>{suggestion.name}</span>
                  {detail && <span className="ml-auto shrink-0 font-numeric text-xs text-ink-faint">{detail}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
