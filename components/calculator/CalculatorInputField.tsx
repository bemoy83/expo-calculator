'use client';

import { useId, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import {
  createCatalogIndex,
  getSortedLaborForCategory,
  getSortedMaterialsForCategory,
} from '@/lib/calculations/catalog-index';
import { selectedChoiceId } from '@/lib/calculator/conditions';
import { displayUnit } from '@/lib/calculator/format';
import type { CalculatorInput, CalculatorLibrary, CalculatorValue } from '@/lib/calculator/types';
import { convertFromBase, normalizeToBase } from '@/lib/units';
import { cn, formatDisplayNumber } from '@/lib/utils';

interface CalculatorInputFieldProps {
  input: CalculatorInput;
  /** What was typed or picked; undefined until then. */
  rawValue: CalculatorValue | undefined;
  /** The value the math uses (typed, else default); undefined when it has none. */
  resolvedValue: number | boolean | string | undefined;
  /** A result is waiting for this input. */
  needed: boolean;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  onChange: (value: CalculatorValue | undefined) => void;
}

// One calculator input as staff see it: the widget for its kind, its unit, help text, and a
// note when a result is waiting for it. Numbers are shown in the input's unit and stored in
// base units.
export function CalculatorInputField({
  input,
  rawValue,
  resolvedValue,
  needed,
  library,
  formatMoney,
  onChange,
}: CalculatorInputFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const spec = input.value;
  const unit = 'unitSymbol' in spec ? displayUnit(spec.unitSymbol) : undefined;
  const describedBy = input.help || needed ? helpId : undefined;

  const footer = (input.help || needed) && (
    <div id={helpId} className="mt-1 space-y-0.5">
      {needed && <p className="text-xs font-medium text-draft">Needed to calculate</p>}
      {input.help && <p className="text-xs text-ink-muted">{input.help}</p>}
    </div>
  );

  if (spec.kind === 'boolean') {
    return (
      <div>
        <div className="flex items-center min-h-[38px]">
          <Checkbox
            id={id}
            label={input.label}
            checked={resolvedValue === true}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.checked)}
          />
        </div>
        {footer}
      </div>
    );
  }

  const label = (
    <label htmlFor={id} className={FIELD_LABEL}>
      {input.label}
      {unit && <span className="ml-1 font-numeric text-ink-faint">{unit}</span>}
    </label>
  );

  let control: React.ReactNode;
  switch (spec.kind) {
    case 'number':
      control = (
        <NumberControl
          id={id}
          unitSymbol={spec.unitSymbol}
          value={typeof resolvedValue === 'number' ? resolvedValue : undefined}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          needed={needed}
          describedBy={describedBy}
          onChange={onChange}
        />
      );
      break;
    case 'choice': {
      const selected = selectedChoiceId(input, rawValue) ?? '';
      const optionLabel = (text: string) => (unit ? `${text} ${unit}` : text);
      control =
        input.widget === 'segmented' || input.widget === 'radio' ? (
          <div
            role="radiogroup"
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            className="flex flex-wrap gap-1 p-1 rounded-md bg-sunken"
          >
            {spec.options.map((option) => {
              const active = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(option.id)}
                  className={cn(
                    'flex-1 h-8 px-3 rounded text-[13px] font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                    active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {optionLabel(option.label)}
                </button>
              );
            })}
          </div>
        ) : (
          <Select
            id={id}
            value={selected}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value || undefined)}
            className={cn(needed && !selected && 'border-draft')}
            options={[
              ...(selected ? [] : [{ value: '', label: 'Choose…' }]),
              ...spec.options.map((option) => ({ value: option.id, label: optionLabel(option.label) })),
            ]}
          />
        );
      break;
    }
    case 'material':
    case 'labor':
      control = (
        <PickerControl
          id={id}
          kind={spec.kind}
          category={spec.category}
          value={typeof resolvedValue === 'string' ? resolvedValue : ''}
          needed={needed}
          describedBy={describedBy}
          library={library}
          formatMoney={formatMoney}
          onChange={onChange}
        />
      );
      break;
    case 'text':
      control = (
        <Input
          id={id}
          value={typeof rawValue === 'string' ? rawValue : spec.default ?? ''}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      );
      break;
  }

  return (
    <div>
      {input.value.kind === 'choice' && (input.widget === 'segmented' || input.widget === 'radio') ? (
        <span id={`${id}-label`} className={FIELD_LABEL}>
          {input.label}
          {unit && <span className="ml-1 font-numeric text-ink-faint">{unit}</span>}
        </span>
      ) : (
        label
      )}
      {control}
      {footer}
    </div>
  );
}

function NumberControl({
  id,
  unitSymbol,
  value,
  min,
  max,
  step,
  needed,
  describedBy,
  onChange,
}: {
  id: string;
  unitSymbol?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  needed: boolean;
  describedBy?: string;
  onChange: (value: number | undefined) => void;
}) {
  // While typing, show exactly what was typed ("2." stays "2."); otherwise the value in the
  // input's unit.
  const [typing, setTyping] = useState<string | null>(null);
  const shown = value === undefined ? '' : formatDisplayNumber(unitSymbol ? convertFromBase(value, unitSymbol) : value);
  const toDisplay = (base: number | undefined) =>
    base === undefined ? undefined : unitSymbol ? convertFromBase(base, unitSymbol) : base;

  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      value={typing ?? shown}
      min={toDisplay(min)}
      max={toDisplay(max)}
      step={step === undefined ? 'any' : toDisplay(step)}
      aria-describedby={describedBy}
      className={cn(needed && value === undefined && 'border-draft')}
      onFocus={(event) => event.target.select()}
      onBlur={() => setTyping(null)}
      onChange={(event) => {
        const text = event.target.value;
        setTyping(text);
        if (text.trim() === '') {
          onChange(undefined);
          return;
        }
        const number = Number(text);
        if (Number.isFinite(number)) onChange(unitSymbol ? normalizeToBase(number, unitSymbol) : number);
      }}
    />
  );
}

function PickerControl({
  id,
  kind,
  category,
  value,
  needed,
  describedBy,
  library,
  formatMoney,
  onChange,
}: {
  id: string;
  kind: 'material' | 'labor';
  category?: string;
  value: string;
  needed: boolean;
  describedBy?: string;
  library: CalculatorLibrary;
  formatMoney: (amount: number) => string;
  onChange: (value: string | undefined) => void;
}) {
  const index = useMemo(() => createCatalogIndex(library.materials, library.labor), [library.materials, library.labor]);
  const options =
    kind === 'material'
      ? getSortedMaterialsForCategory(index, category).map((item) => ({
          value: item.variableName,
          label: `${item.name} · ${formatMoney(item.price)}/${item.unit}`,
        }))
      : getSortedLaborForCategory(index, category).map((item) => ({
          value: item.variableName,
          label: `${item.name} · ${formatMoney(item.cost)}/h`,
        }));

  return (
    <>
      <Select
        id={id}
        value={value}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={cn(needed && !value && 'border-draft')}
        options={[...(value ? [] : [{ value: '', label: kind === 'material' ? 'Choose a material…' : 'Choose labor…' }]), ...options]}
      />
      {options.length === 0 && (
        <p className="mt-1 text-xs text-ink-muted">
          Nothing in {category ? `“${category}”` : 'the catalog'} yet.
        </p>
      )}
    </>
  );
}
