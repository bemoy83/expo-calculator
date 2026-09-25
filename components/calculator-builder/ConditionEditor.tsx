'use client';

import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { conditionInputs, defaultCondition } from '@/lib/calculator/editing';
import { displayUnit } from '@/lib/calculator/format';
import type { Calculator, CalculatorInput, CalculatorLibrary, Condition } from '@/lib/calculator/types';
import { convertFromBase, normalizeToBase } from '@/lib/units';
import { formatDisplayNumber } from '@/lib/utils';

const COMPARISONS: Array<{ value: '>' | '<' | '>=' | '<='; label: string }> = [
  { value: '>', label: 'is more than' },
  { value: '>=', label: 'is at least' },
  { value: '<', label: 'is less than' },
  { value: '<=', label: 'is at most' },
];

function catalogFor(input: CalculatorInput, library: CalculatorLibrary) {
  if (input.value.kind !== 'material' && input.value.kind !== 'labor') return [];
  const category = input.value.category;
  const items: Array<{ variableName: string; name: string; category: string }> =
    input.value.kind === 'material' ? library.materials : library.labor;
  return items.filter((item) => !category || item.category === category).sort((a, b) => a.name.localeCompare(b.name));
}

// A number typed in the input's unit, kept as typed while editing.
function NumberValue({ id, value, unitSymbol, onChange }: { id: string; value: number; unitSymbol?: string; onChange: (base: number) => void }) {
  const [typing, setTyping] = useState<string | null>(null);
  const shown = formatDisplayNumber(unitSymbol ? convertFromBase(value, unitSymbol) : value);
  const unit = displayUnit(unitSymbol);
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        aria-label="Value"
        value={typing ?? shown}
        onBlur={() => setTyping(null)}
        onChange={(event) => {
          setTyping(event.target.value);
          const number = Number(event.target.value);
          if (event.target.value.trim() !== '' && Number.isFinite(number)) {
            onChange(unitSymbol ? normalizeToBase(number, unitSymbol) : number);
          }
        }}
      />
      {unit && <span className="text-xs font-numeric text-ink-muted">{unit}</span>}
    </div>
  );
}

// "Only when [input] [is on / is Gloss / is more than 3 m]": a checkbox turns the condition on
// or off, then the input and the test, shaped by the input's kind.
export function ConditionEditor({
  label,
  calculator,
  condition,
  exceptKey,
  library,
  onChange,
}: {
  /** e.g. "Only calculate when…" */
  label: string;
  calculator: Calculator;
  condition: Condition | undefined;
  /** An input can't depend on itself. */
  exceptKey?: string;
  library: CalculatorLibrary;
  onChange: (condition: Condition | undefined) => void;
}) {
  const id = useId();
  const candidates = conditionInputs(calculator, exceptKey);
  const input = condition ? calculator.inputs.find((candidate) => candidate.key === condition.inputKey) : undefined;

  const start = (next: CalculatorInput) => onChange(defaultCondition(next, catalogFor(next, library)[0]?.variableName));

  if (!condition) {
    return (
      <Checkbox
        label={label}
        checked={false}
        disabled={candidates.length === 0}
        title={candidates.length === 0 ? 'Add a yes/no, choice, number or material input first.' : undefined}
        onChange={(event) => event.target.checked && candidates[0] && start(candidates.find((c) => c.value.kind === 'boolean') ?? candidates[0])}
      />
    );
  }

  let test: React.ReactNode = null;
  if (input) {
    const spec = input.value;
    if (spec.kind === 'boolean') {
      const on = (condition.op === 'is') === (condition.value === true);
      test = (
        <Select
          aria-label="Test"
          value={on ? 'on' : 'off'}
          options={[
            { value: 'on', label: 'is on' },
            { value: 'off', label: 'is off' },
          ]}
          onChange={(event) => onChange({ inputKey: input.key, op: 'is', value: event.target.value === 'on' })}
        />
      );
    } else if (spec.kind === 'choice' || spec.kind === 'material' || spec.kind === 'labor') {
      const choices =
        spec.kind === 'choice'
          ? spec.options.map((option) => ({ value: option.id, label: `${option.label}${spec.unitSymbol ? ` ${displayUnit(spec.unitSymbol)}` : ''}` }))
          : catalogFor(input, library).map((item) => ({ value: item.variableName, label: item.name }));
      const isMatch = condition.op === 'is' || condition.op === 'isNot';
      test = (
        <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-2">
          <Select
            aria-label="Test"
            value={condition.op}
            options={[
              { value: 'is', label: 'is' },
              { value: 'isNot', label: 'is not' },
              ...(spec.kind === 'choice' ? COMPARISONS : []),
            ]}
            onChange={(event) => {
              const op = event.target.value as Condition['op'];
              if (op === 'is' || op === 'isNot') {
                onChange({ inputKey: input.key, op, value: isMatch ? condition.value : choices[0]?.value ?? '' });
              } else {
                onChange({ inputKey: input.key, op, value: isMatch ? 0 : Number(condition.value) });
              }
            }}
          />
          {isMatch ? (
            <Select
              aria-label="Value"
              value={String(condition.value)}
              options={[...(choices.some((choice) => choice.value === condition.value) ? [] : [{ value: String(condition.value), label: 'Choose…' }]), ...choices]}
              onChange={(event) => onChange({ inputKey: input.key, op: condition.op as 'is' | 'isNot', value: event.target.value })}
            />
          ) : (
            <NumberValue
              id={`${id}-value`}
              value={Number(condition.value)}
              unitSymbol={spec.kind === 'choice' ? spec.unitSymbol : undefined}
              onChange={(value) => onChange({ inputKey: input.key, op: condition.op as '>' | '<' | '>=' | '<=', value })}
            />
          )}
        </div>
      );
    } else if (spec.kind === 'number') {
      const op = condition.op === 'is' || condition.op === 'isNot' ? '>' : condition.op;
      test = (
        <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-2">
          <Select
            aria-label="Test"
            value={op}
            options={COMPARISONS}
            onChange={(event) => onChange({ inputKey: input.key, op: event.target.value as typeof op, value: Number(condition.value) || 0 })}
          />
          <NumberValue
            id={`${id}-value`}
            value={Number(condition.value) || 0}
            unitSymbol={spec.unitSymbol}
            onChange={(value) => onChange({ inputKey: input.key, op, value })}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-2">
      <Checkbox label={label} checked onChange={() => onChange(undefined)} />
      <div className="grid grid-cols-1 gap-2 pl-6">
        <Select
          aria-label="Input"
          value={condition.inputKey}
          options={[
            ...(input ? [] : [{ value: condition.inputKey, label: `${condition.inputKey} (deleted)` }]),
            ...candidates.map((candidate) => ({ value: candidate.key, label: candidate.label })),
          ]}
          onChange={(event) => {
            const next = candidates.find((candidate) => candidate.key === event.target.value);
            if (next) start(next);
          }}
        />
        {test}
      </div>
    </div>
  );
}
