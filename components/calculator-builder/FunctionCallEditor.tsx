'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { displayUnit } from '@/lib/calculator/format';
import { callToExpression } from '@/lib/calculator/step-source';
import type { Binding, Calculator, CalculatorLibrary, CalculatorStep, StepSource } from '@/lib/calculator/types';
import { getFunctionParamKinds } from '@/lib/functions/param-kinds';
import type { FunctionParamKind, SharedFunction } from '@/lib/types';
import { getUnitCategory } from '@/lib/units';

type CallSource = Extract<StepSource, { type: 'call' }>;
type Param = SharedFunction['parameters'][number];

const NEW_INPUT = 'new';
const CONSTANT = 'constant';

function bindingValue(binding: Binding | undefined): string {
  if (!binding) return '';
  switch (binding.type) {
    case 'input':
      return `input:${binding.key}`;
    case 'step':
      return `step:${binding.key}`;
    case 'constant':
      return CONSTANT;
    case 'property':
      return `property:${binding.inputKey}:${binding.property}`;
  }
}

/** Options a parameter of this kind can take: matching inputs, results, properties, a number. */
function bindingOptions(calculator: Calculator, step: CalculatorStep, kind: FunctionParamKind, library: CalculatorLibrary) {
  const options: Array<{ value: string; label: string }> = [{ value: '', label: 'Choose…' }];
  if (kind === 'material' || kind === 'labor') {
    for (const input of calculator.inputs.filter((candidate) => candidate.value.kind === kind)) {
      options.push({ value: `input:${input.key}`, label: `Input · ${input.label}` });
    }
    options.push({ value: NEW_INPUT, label: `New ${kind} input…` });
    return options;
  }
  for (const input of calculator.inputs) {
    const inputKind = input.value.kind;
    if (inputKind !== 'number' && inputKind !== 'choice' && inputKind !== 'boolean') continue;
    const unit = 'unitSymbol' in input.value ? displayUnit(input.value.unitSymbol) : undefined;
    options.push({ value: `input:${input.key}`, label: `Input · ${input.label}${unit ? ` (${unit})` : ''}` });
  }
  for (const other of calculator.steps) {
    if (other.id === step.id) continue;
    options.push({ value: `step:${other.key}`, label: `Result · ${other.label || other.key}` });
  }
  for (const input of calculator.inputs) {
    if (input.value.kind !== 'material' && input.value.kind !== 'labor') continue;
    const category = input.value.category;
    const items: Array<{ category: string; properties?: Array<{ name: string }> }> =
      input.value.kind === 'material' ? library.materials : library.labor;
    const properties = new Set<string>();
    items
      .filter((item) => !category || item.category === category)
      .forEach((item) => item.properties?.forEach((property) => properties.add(property.name)));
    for (const property of [...properties].sort()) {
      options.push({ value: `property:${input.key}:${property}`, label: `Property · ${input.label} → ${property}` });
    }
  }
  options.push({ value: CONSTANT, label: 'A fixed number…' });
  options.push({ value: NEW_INPUT, label: 'New input…' });
  return options;
}

/** A note when what's picked is in a different kind of unit than the parameter expects. */
function unitMismatch(calculator: Calculator, binding: Binding | undefined, param: Param): string | undefined {
  const expected = param.unitCategory ?? (param.unitSymbol ? getUnitCategory(param.unitSymbol) : undefined);
  if (!expected || !binding) return undefined;
  let actual: string | undefined;
  let name = '';
  if (binding.type === 'input') {
    const input = calculator.inputs.find((candidate) => candidate.key === binding.key);
    name = input?.label ?? binding.key;
    if (input && 'unitSymbol' in input.value) {
      actual = input.value.unitCategory ?? (input.value.unitSymbol ? getUnitCategory(input.value.unitSymbol) : undefined);
    }
  } else if (binding.type === 'step') {
    const step = calculator.steps.find((candidate) => candidate.key === binding.key);
    name = step?.label ?? binding.key;
    actual = step?.unitCategory ?? (step?.unitSymbol ? getUnitCategory(step.unitSymbol) : undefined);
  }
  if (!actual || actual === expected) return undefined;
  return `${name} is a ${actual}; this expects a ${expected}.`;
}

// Builds a function-call step: pick a function, then give each parameter an input, a
// result, a material/labor property, or a number, from lists filtered by what the
// parameter expects.
export function FunctionCallEditor({
  calculator,
  step,
  source,
  library,
  onChange,
  onCreateInputFor,
}: {
  calculator: Calculator;
  step: CalculatorStep;
  source: CallSource;
  library: CalculatorLibrary;
  onChange: (source: CallSource) => void;
  /** Opens the input dialog for a new input bound to this parameter. */
  onCreateInputFor: (paramName: string, kind: FunctionParamKind) => void;
}) {
  const id = useId();
  const fn = library.functions.find((candidate) => candidate.name === source.functionName);
  const kinds = fn ? getFunctionParamKinds(fn) : {};
  const functionOptions = [...library.functions]
    .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || (a.displayName || a.name).localeCompare(b.displayName || b.name))
    .map((candidate) => ({
      value: candidate.name,
      label: `${candidate.displayName || candidate.name}${candidate.category ? ` · ${candidate.category}` : ''}`,
    }));

  const setBinding = (param: string, binding: Binding | undefined) => {
    const args = { ...source.args };
    if (binding) args[param] = binding;
    else delete args[param];
    onChange({ ...source, args });
  };

  return (
    <div className="space-y-3">
      <div>
        <Select
          label="Function"
          value={source.functionName}
          options={[
            ...(fn ? [] : [{ value: source.functionName, label: source.functionName ? `${source.functionName} (missing)` : 'Choose a function…' }]),
            ...functionOptions,
          ]}
          onChange={(event) => {
            const next = library.functions.find((candidate) => candidate.name === event.target.value);
            if (!next) return;
            // Keep values for parameters that share a name with the old function's.
            const args = Object.fromEntries(
              next.parameters.filter((param) => source.args[param.name]).map((param) => [param.name, source.args[param.name]])
            );
            onChange({ type: 'call', functionName: next.name, args });
          }}
        />
        {library.functions.length === 0 && (
          <p className="mt-1 text-xs text-ink-muted">There are no functions yet. Create them on the Functions page.</p>
        )}
        {fn?.description && <p className="mt-1 text-xs text-ink-muted">{fn.description}</p>}
      </div>

      {fn && fn.parameters.length > 0 && (
        <div className="space-y-2.5">
          {fn.parameters.map((param) => {
            const kind = kinds[param.name] ?? 'number';
            const binding = source.args[param.name];
            const selectId = `${id}-${param.name}`;
            const unit = displayUnit(param.unitSymbol);
            const mismatch = unitMismatch(calculator, binding, param);
            return (
              <div key={param.name} className="grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1 items-start">
                <label htmlFor={selectId} className="pt-2 text-xs font-medium text-ink-body">
                  {param.label || param.name}
                  {unit && <span className="ml-1 font-numeric text-ink-faint">{unit}</span>}
                  {kind !== 'number' && <span className="ml-1 text-ink-faint">({kind === 'boolean' ? 'yes/no' : kind})</span>}
                </label>
                <div className="space-y-1.5 min-w-0">
                  <Select
                    id={selectId}
                    value={bindingValue(binding)}
                    options={bindingOptions(calculator, step, kind, library)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === NEW_INPUT) onCreateInputFor(param.name, kind);
                      else if (value === CONSTANT) setBinding(param.name, { type: 'constant', value: 0, unitSymbol: param.unitSymbol });
                      else if (value.startsWith('input:')) setBinding(param.name, { type: 'input', key: value.slice(6) });
                      else if (value.startsWith('step:')) setBinding(param.name, { type: 'step', key: value.slice(5) });
                      else if (value.startsWith('property:')) {
                        const [, inputKey, property] = value.split(':');
                        setBinding(param.name, { type: 'property', inputKey, property });
                      } else setBinding(param.name, undefined);
                    }}
                  />
                  {binding?.type === 'constant' && (
                    <div className="flex items-center gap-2">
                      <ConstantInput
                        label={`${param.label || param.name} value`}
                        value={binding.value}
                        onChange={(value) => setBinding(param.name, { ...binding, value })}
                      />
                      {binding.unitSymbol && (
                        <span className="text-xs font-numeric text-ink-muted">{displayUnit(binding.unitSymbol)}</span>
                      )}
                    </div>
                  )}
                  {mismatch && <p className="text-xs text-draft">{mismatch}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fn && (
        <code className="block text-[11.5px] font-numeric text-ink-muted break-all">
          = {callToExpression(source, library.functions)}
        </code>
      )}
    </div>
  );
}

// A number box that keeps what's typed ("0." stays "0.") and reports finite numbers.
function ConstantInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <Input
      type="number"
      aria-label={label}
      value={typing ?? String(value)}
      onBlur={() => setTyping(null)}
      onChange={(event) => {
        setTyping(event.target.value);
        const number = Number(event.target.value);
        if (event.target.value.trim() !== '' && Number.isFinite(number)) onChange(number);
      }}
    />
  );
}
