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
import { missingProperties } from '@/lib/calculator/requirements';
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
  /** For material/labor inputs: properties the calculator reads from what's picked. */
  requiredProperties?: string[];
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
  requiredProperties,
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
    const checked = resolvedValue === true;
    return (
      <div>
        <div className="flex items-center min-h-[38px]">
          {input.widget === 'checkbox' ? (
            <Checkbox
              id={id}
              label={input.label}
              checked={checked}
              aria-describedby={describedBy}
              onChange={(event) => onChange(event.target.checked)}
            />
          ) : (
            <button
              id={id}
              type="button"
              role="switch"
              aria-checked={checked}
              aria-describedby={describedBy}
              onClick={() => onChange(!checked)}
              className="group inline-flex items-center gap-2.5 text-sm text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
                  checked ? 'bg-action-solid' : 'bg-border-strong'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-card transition-transform',
                    checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                  )}
                />
              </span>
              {input.label}
            </button>
          )}
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
    case 'number': {
      const numberProps = {
        id,
        unitSymbol: spec.unitSymbol,
        value: typeof resolvedValue === 'number' ? resolvedValue : undefined,
        min: spec.min,
        max: spec.max,
        step: spec.step,
        needed,
        describedBy,
        onChange,
      };
      control =
        input.widget === 'slider' ? (
          <SliderControl {...numberProps} unit={unit} />
        ) : input.widget === 'stepper' ? (
          <StepperControl {...numberProps} label={input.label} />
        ) : (
          <NumberControl {...numberProps} />
        );
      break;
    }
    case 'choice': {
      const selected = selectedChoiceId(input, rawValue) ?? '';
      const optionLabel = (text: string) => (unit ? `${text} ${unit}` : text);
      control =
        input.widget === 'radio' ? (
          <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="space-y-1.5 pt-0.5">
            {spec.options.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="radio"
                  name={id}
                  checked={option.id === selected}
                  onChange={() => onChange(option.id)}
                  className="h-4 w-4 accent-action-solid cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                />
                {optionLabel(option.label)}
              </label>
            ))}
          </div>
        ) : input.widget === 'segmented' ? (
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
          requiredProperties={requiredProperties}
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
      {spec.kind === 'choice' && (input.widget === 'segmented' || input.widget === 'radio') ? (
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

// Items lacking a property the calculator reads from them can't be picked; they stay listed,
// marked with what they lack, so it's clear why.
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
  requiredProperties,
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
  requiredProperties?: string[];
}) {
  const index = useMemo(() => createCatalogIndex(library.materials, library.labor), [library.materials, library.labor]);
  const items = kind === 'material' ? getSortedMaterialsForCategory(index, category) : getSortedLaborForCategory(index, category);
  const options = items.map((item) => {
    const missing = missingProperties(item, requiredProperties);
    const price = 'price' in item ? `${formatMoney(item.price)}/${item.unit}` : `${formatMoney(item.cost)}/h`;
    return {
      value: item.variableName,
      label: missing.length > 0 ? `${item.name} · missing ${missing.join(', ')}` : `${item.name} · ${price}`,
      disabled: missing.length > 0 && item.variableName !== value,
    };
  });
  const selected = items.find((item) => item.variableName === value);
  const selectedMissing = selected ? missingProperties(selected, requiredProperties) : [];

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
      {selectedMissing.length > 0 && (
        <p className="mt-1 text-xs text-danger">
          {selected!.name} has no {selectedMissing.join(', ')}, which this calculator needs. Choose another or add it in the catalog.
        </p>
      )}
    </>
  );
}

type NumberControlProps = Parameters<typeof NumberControl>[0];

function clamp(value: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}

// − value + : steps by the input's step (or 1 in its unit), staying within min and max.
function StepperControl({ label, ...props }: NumberControlProps & { label: string }) {
  const { unitSymbol, value, min, max, step, onChange } = props;
  const toBase = (display: number) => (unitSymbol ? normalizeToBase(display, unitSymbol) : display);
  const toShown = (base: number) => (unitSymbol ? convertFromBase(base, unitSymbol) : base);
  const stepShown = step !== undefined ? toShown(step) : 1;
  const bump = (direction: 1 | -1) => {
    const current = value === undefined ? (min !== undefined ? toShown(min) : 0) : toShown(value);
    const next = Number((current + direction * stepShown).toPrecision(12));
    onChange(clamp(toBase(next), min, max));
  };
  const buttonClass =
    'h-[38px] w-10 shrink-0 rounded-md border border-border-strong bg-surface text-ink text-lg leading-none hover:bg-surface-hover disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-action';
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={buttonClass}
        aria-label={`Decrease ${label}`}
        disabled={value !== undefined && min !== undefined && value <= min}
        onClick={() => bump(-1)}
      >
        −
      </button>
      <NumberControl {...props} />
      <button
        type="button"
        className={buttonClass}
        aria-label={`Increase ${label}`}
        disabled={value !== undefined && max !== undefined && value >= max}
        onClick={() => bump(1)}
      >
        +
      </button>
    </div>
  );
}

// A range slider with the value beside it. Without min/max it spans 0–100 in the input's unit.
function SliderControl({ unit, ...props }: NumberControlProps & { unit?: string }) {
  const { id, unitSymbol, value, min, max, step, describedBy, onChange } = props;
  const toShown = (base: number) => (unitSymbol ? convertFromBase(base, unitSymbol) : base);
  const toBase = (display: number) => (unitSymbol ? normalizeToBase(display, unitSymbol) : display);
  const low = min !== undefined ? toShown(min) : 0;
  const high = max !== undefined ? toShown(max) : 100;
  const shown = value === undefined ? undefined : toShown(value);
  return (
    <div className="flex items-center gap-3 min-h-[38px]">
      <input
        id={id}
        type="range"
        min={low}
        max={high}
        step={step !== undefined ? toShown(step) : 'any'}
        value={shown ?? low}
        aria-describedby={describedBy}
        onChange={(event) => onChange(toBase(Number(event.target.value)))}
        className="flex-1 accent-action-solid cursor-pointer"
      />
      <span className="w-20 text-right font-numeric text-sm text-ink tabular-nums">
        {shown === undefined ? '—' : formatDisplayNumber(shown)}
        {unit && <span className="ml-1 text-ink-faint text-[0.85em]">{unit}</span>}
      </span>
    </div>
  );
}
