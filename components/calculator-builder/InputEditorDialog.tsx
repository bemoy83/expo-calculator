'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { ModalDialog } from '@/components/shared/ModalDialog';
import { defaultWidget, keyProblem, suggestKey } from '@/lib/calculator/editing';
import { displayUnit } from '@/lib/calculator/format';
import type { Calculator, CalculatorInput, CalculatorLibrary, InputKind } from '@/lib/calculator/types';
import { convertFromBase, getAllUnitSymbols, getUnitCategory, normalizeToBase } from '@/lib/units';
import { formatDisplayNumber, generateId } from '@/lib/utils';

const KIND_OPTIONS: Array<{ value: InputKind; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'choice', label: 'Choice (list of values)' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'text', label: 'Text note (not used in math)' },
];

interface OptionDraft {
  id: string;
  label: string;
  /** In the input's unit, as typed. */
  value: string;
}

interface Draft {
  label: string;
  key: string;
  keyTouched: boolean;
  kind: InputKind;
  unitSymbol: string;
  /** Number default in the unit, choice option id, material/labor name, or text. */
  defaultValue: string;
  defaultOn: boolean;
  /** Number limits, in the unit, as typed. */
  min: string;
  max: string;
  step: string;
  options: OptionDraft[];
  category: string;
  help: string;
}

function toDisplay(value: number, unitSymbol: string) {
  return formatDisplayNumber(unitSymbol ? convertFromBase(value, unitSymbol) : value);
}

function draftFrom(
  input: CalculatorInput | undefined,
  calculator: Calculator,
  suggestedKey?: string,
  suggestedKind?: InputKind,
  suggestedLabel?: string
): Draft {
  if (!input) {
    const key = suggestedKey ?? '';
    return {
      label: suggestedLabel ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      key,
      keyTouched: !!suggestedKey,
      kind: suggestedKind ?? 'number',
      unitSymbol: '',
      defaultValue: '',
      defaultOn: false,
      min: '',
      max: '',
      step: '',
      options: [],
      category: '',
      help: '',
    };
  }
  const spec = input.value;
  const unitSymbol = 'unitSymbol' in spec ? spec.unitSymbol ?? '' : '';
  return {
    label: input.label,
    key: input.key,
    keyTouched: true,
    kind: spec.kind,
    unitSymbol,
    defaultValue:
      spec.kind === 'number'
        ? spec.default === undefined
          ? ''
          : toDisplay(spec.default, unitSymbol)
        : spec.kind === 'boolean'
          ? ''
          : spec.default ?? '',
    defaultOn: spec.kind === 'boolean' ? !!spec.default : false,
    min: spec.kind === 'number' && spec.min !== undefined ? toDisplay(spec.min, unitSymbol) : '',
    max: spec.kind === 'number' && spec.max !== undefined ? toDisplay(spec.max, unitSymbol) : '',
    step: spec.kind === 'number' && spec.step !== undefined ? toDisplay(spec.step, unitSymbol) : '',
    options:
      spec.kind === 'choice'
        ? spec.options.map((option) => ({ id: option.id, label: option.label, value: toDisplay(option.value, unitSymbol) }))
        : [],
    category: spec.kind === 'material' || spec.kind === 'labor' ? spec.category ?? '' : '',
    help: input.help ?? '',
  };
}

interface InputEditorDialogProps {
  isOpen: boolean;
  calculator: Calculator;
  /** The input to edit; a new one when undefined. */
  input?: CalculatorInput;
  /** For a new input: the name a formula already uses. */
  suggestedKey?: string;
  /** For a new input: the kind it should be. */
  suggestedKind?: InputKind;
  /** For a new input: its label. */
  suggestedLabel?: string;
  library: CalculatorLibrary;
  onSave: (input: CalculatorInput) => void;
  onDelete?: (input: CalculatorInput) => void;
  onClose: () => void;
}

// Creates or edits a calculator input: what the math receives (kind, unit, default, the
// values of a choice) plus its label and help. How it is shown to staff (widget, width) is
// the layout's business.
export function InputEditorDialog({
  isOpen,
  calculator,
  input,
  suggestedKey,
  suggestedKind,
  suggestedLabel,
  library,
  onSave,
  onDelete,
  onClose,
}: InputEditorDialogProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(input, calculator, suggestedKey, suggestedKind, suggestedLabel));
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(draftFrom(input, calculator, suggestedKey, suggestedKind, suggestedLabel));
      setShowErrors(false);
    }
    // Reset only when the dialog opens for another input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, input?.id, suggestedKey, suggestedKind, suggestedLabel]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const categories = useMemo(() => {
    const items: Array<{ category: string }> = draft.kind === 'labor' ? library.labor : library.materials;
    return [...new Set(items.map((item) => item.category.trim()).filter(Boolean))].sort();
  }, [draft.kind, library]);

  const catalogItems = useMemo(() => {
    const items: Array<{ variableName: string; name: string; category: string }> =
      draft.kind === 'labor' ? library.labor : library.materials;
    return items
      .filter((item) => !draft.category || item.category === draft.category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [draft.kind, draft.category, library]);

  const unitOptions = useMemo(
    () => [
      { value: '', label: 'No unit' },
      ...getAllUnitSymbols().map((symbol) => ({ value: symbol, label: displayUnit(symbol) ?? symbol })),
    ],
    []
  );

  const nameProblem = keyProblem(calculator, draft.key, input?.id);
  const labelProblem = draft.label.trim() ? undefined : 'Give it a label.';
  const optionProblem =
    draft.kind === 'choice'
      ? draft.options.length === 0
        ? 'Add at least one value.'
        : draft.options.some((option) => !option.label.trim() || !Number.isFinite(Number(option.value)) || option.value.trim() === '')
          ? 'Each value needs a label and a number.'
          : undefined
      : undefined;
  const notNumber = (text: string) => text.trim() !== '' && !Number.isFinite(Number(text));
  const defaultProblem =
    draft.kind === 'number' && notNumber(draft.defaultValue) ? 'The default must be a number.' : undefined;
  const limitsProblem =
    draft.kind !== 'number'
      ? undefined
      : notNumber(draft.min) || notNumber(draft.max) || notNumber(draft.step)
        ? 'Limits must be numbers.'
        : draft.min.trim() !== '' && draft.max.trim() !== '' && Number(draft.min) > Number(draft.max)
          ? 'The lowest value is above the highest.'
          : draft.step.trim() !== '' && Number(draft.step) <= 0
            ? 'The step must be above 0.'
            : undefined;

  const save = () => {
    if (labelProblem || nameProblem || optionProblem || defaultProblem || limitsProblem) {
      setShowErrors(true);
      return;
    }
    const unitSymbol = draft.unitSymbol || undefined;
    const unitCategory = unitSymbol ? getUnitCategory(unitSymbol) : undefined;
    const toBase = (text: string) => (unitSymbol ? normalizeToBase(Number(text), unitSymbol) : Number(text));
    const optionalBase = (text: string) => (text.trim() === '' ? undefined : toBase(text));
    let value: CalculatorInput['value'];
    switch (draft.kind) {
      case 'number':
        value = {
          kind: 'number',
          unitSymbol,
          unitCategory,
          default: optionalBase(draft.defaultValue),
          min: optionalBase(draft.min),
          max: optionalBase(draft.max),
          step: optionalBase(draft.step),
        };
        break;
      case 'boolean':
        value = { kind: 'boolean', default: draft.defaultOn };
        break;
      case 'choice':
        value = {
          kind: 'choice',
          unitSymbol,
          unitCategory,
          options: draft.options.map((option) => ({ id: option.id, label: option.label.trim(), value: toBase(option.value) })),
          default: draft.options.some((option) => option.id === draft.defaultValue) ? draft.defaultValue : undefined,
        };
        break;
      case 'material':
      case 'labor':
        value = { kind: draft.kind, category: draft.category || undefined, default: draft.defaultValue || undefined };
        break;
      case 'text':
        value = { kind: 'text', default: draft.defaultValue || undefined };
        break;
    }
    onSave({
      id: input?.id ?? generateId(),
      key: draft.key,
      label: draft.label.trim(),
      help: draft.help.trim() || undefined,
      value,
      widget: input && input.value.kind === draft.kind ? input.widget : defaultWidget(draft.kind),
      visibleWhen: input?.visibleWhen,
    });
  };

  const hasUnit = draft.kind === 'number' || draft.kind === 'choice';

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={input ? 'Edit input' : 'New input'} maxWidth="large">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Label"
            value={draft.label}
            data-autofocus
            error={showErrors ? labelProblem : undefined}
            onChange={(event) => {
              const label = event.target.value;
              set(draft.keyTouched ? { label } : { label, key: suggestKey(calculator, label, input?.id, '') });
            }}
            placeholder="e.g. Wall width"
          />
          <Input
            label="Name in formulas"
            value={draft.key}
            className="font-numeric"
            error={showErrors || (draft.key && nameProblem) ? nameProblem : undefined}
            onChange={(event) => set({ key: event.target.value.trim(), keyTouched: true })}
            placeholder="wall_width"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Kind"
            value={draft.kind}
            options={KIND_OPTIONS}
            onChange={(event) => set({ kind: event.target.value as InputKind, defaultValue: '', category: '' })}
          />
          {hasUnit && (
            <Select
              label="Unit"
              value={draft.unitSymbol}
              options={unitOptions}
              onChange={(event) => set({ unitSymbol: event.target.value })}
            />
          )}
          {(draft.kind === 'material' || draft.kind === 'labor') && (
            <Select
              label="Category"
              value={draft.category}
              options={[{ value: '', label: 'All categories' }, ...categories.map((category) => ({ value: category, label: category }))]}
              onChange={(event) => set({ category: event.target.value, defaultValue: '' })}
            />
          )}
        </div>

        {draft.kind === 'choice' && (
          <div>
            <span className={FIELD_LABEL}>Values {draft.unitSymbol && `(in ${displayUnit(draft.unitSymbol)})`}</span>
            <div className="space-y-2">
              {draft.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    aria-label={`Label ${index + 1}`}
                    value={option.label}
                    placeholder="Label, e.g. 60"
                    onChange={(event) => {
                      const label = event.target.value;
                      set({
                        options: draft.options.map((candidate) =>
                          candidate.id === option.id
                            ? {
                                ...candidate,
                                label,
                                // A numeric label is usually also the value.
                                value:
                                  candidate.value === '' || candidate.value === candidate.label
                                    ? Number.isFinite(Number(label)) ? label : candidate.value
                                    : candidate.value,
                              }
                            : candidate
                        ),
                      });
                    }}
                  />
                  <Input
                    aria-label={`Value ${index + 1}`}
                    type="number"
                    value={option.value}
                    placeholder="Value"
                    onChange={(event) =>
                      set({
                        options: draft.options.map((candidate) =>
                          candidate.id === option.id ? { ...candidate, value: event.target.value } : candidate
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remove value ${option.label || index + 1}`}
                    onClick={() => set({ options: draft.options.filter((candidate) => candidate.id !== option.id) })}
                    className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set({ options: [...draft.options, { id: generateId(), label: '', value: '' }] })}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Add value
              </Button>
              {showErrors && optionProblem && <p className="text-xs text-danger">{optionProblem}</p>}
            </div>
          </div>
        )}

        {draft.kind === 'number' && (
          <Input
            label={`Default${draft.unitSymbol ? ` (${displayUnit(draft.unitSymbol)})` : ''}`}
            type="number"
            value={draft.defaultValue}
            error={showErrors ? defaultProblem : undefined}
            onChange={(event) => set({ defaultValue: event.target.value })}
            placeholder="Leave empty to require a value"
          />
        )}
        {draft.kind === 'number' && (
          <div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Lowest" type="number" value={draft.min} onChange={(event) => set({ min: event.target.value })} placeholder="Any" />
              <Input label="Highest" type="number" value={draft.max} onChange={(event) => set({ max: event.target.value })} placeholder="Any" />
              <Input label="Step" type="number" value={draft.step} onChange={(event) => set({ step: event.target.value })} placeholder="Any" />
            </div>
            <p className={showErrors && limitsProblem ? 'mt-1 text-xs text-danger' : 'mt-1 text-xs text-ink-muted'}>
              {showErrors && limitsProblem ? limitsProblem : 'Optional. A slider uses them as its range; a stepper moves by the step.'}
            </p>
          </div>
        )}
        {draft.kind === 'boolean' && (
          <Checkbox label="On by default" checked={draft.defaultOn} onChange={(event) => set({ defaultOn: event.target.checked })} />
        )}
        {draft.kind === 'choice' && draft.options.length > 0 && (
          <Select
            label="Default"
            value={draft.defaultValue}
            options={[{ value: '', label: 'None (staff must choose)' }, ...draft.options.map((option) => ({ value: option.id, label: option.label || '(no label)' }))]}
            onChange={(event) => set({ defaultValue: event.target.value })}
          />
        )}
        {(draft.kind === 'material' || draft.kind === 'labor') && (
          <Select
            label="Default"
            value={draft.defaultValue}
            options={[{ value: '', label: 'None (staff must choose)' }, ...catalogItems.map((item) => ({ value: item.variableName, label: item.name }))]}
            onChange={(event) => set({ defaultValue: event.target.value })}
          />
        )}

        <Textarea
          label="Help for staff (optional)"
          value={draft.help}
          rows={2}
          onChange={(event) => set({ help: event.target.value })}
        />

        <div className="flex items-center gap-2 pt-2">
          {input && onDelete && (
            <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => onDelete(input)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Delete input
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {input ? 'Save input' : 'Add input'}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
