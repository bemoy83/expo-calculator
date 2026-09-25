import type { CalculationModule, Field } from '../types';
import { generateId } from '../utils';
import { getUnitCategory, normalizeToBase } from '../units';
import { rewriteExpression } from './dependencies';
import type { Calculator, CalculatorInput, CalculatorStep, ChoiceOption, LayoutItem } from './types';

export interface ModuleConversion {
  calculator: Calculator;
  /** Things that didn't carry over exactly, in plain words. */
  warnings: string[];
}

function uniqueKey(wanted: string, taken: Set<string>): string {
  let key = wanted;
  for (let n = 2; taken.has(key); n += 1) key = `${wanted}_${n}`;
  taken.add(key);
  return key;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function convertDropdown(
  field: Field,
  createId: () => string,
  warnings: string[]
): CalculatorInput['value'] {
  const texts = field.options ?? [];
  // Numeric dropdowns with a unit store the option converted to base units; the others store
  // the option text, which formulas read as a number.
  const converts = field.dropdownMode === 'numeric' && !!field.unitSymbol;
  const allNumeric = texts.length > 0 && texts.every((text) => toNumber(text) !== undefined);
  if (!allNumeric && texts.length > 0) {
    warnings.push(
      `"${field.label}" had text options (${texts.join(', ')}); they are now numbered 1–${texts.length}. Check formulas that use it.`
    );
  }
  const options: ChoiceOption[] = texts.map((text, index) => {
    const number = toNumber(text);
    const value =
      number === undefined ? index + 1 : converts ? normalizeToBase(number, field.unitSymbol!) : number;
    return { id: createId(), label: text, value };
  });

  const defaultNumber = toNumber(field.defaultValue);
  const defaultOption =
    options.find((option, index) =>
      allNumeric ? defaultNumber !== undefined && Math.abs(option.value - defaultNumber) < 1e-9 : texts[index] === field.defaultValue
    ) ?? undefined;
  if (field.defaultValue !== undefined && field.defaultValue !== '' && !defaultOption) {
    warnings.push(`"${field.label}" had a default (${field.defaultValue}) that isn't one of its options; it has no default now.`);
  }

  const unitSymbol = field.unitSymbol;
  return {
    kind: 'choice',
    options,
    unitSymbol,
    unitCategory: field.unitCategory ?? (unitSymbol ? getUnitCategory(unitSymbol) : undefined),
    default: defaultOption?.id,
  };
}

function convertField(field: Field, createId: () => string, warnings: string[]): CalculatorInput {
  const base = { id: createId(), key: field.variableName, label: field.label || field.variableName, help: field.description };
  const unitCategory = field.unitCategory ?? (field.unitSymbol ? getUnitCategory(field.unitSymbol) : undefined);
  switch (field.type) {
    case 'number':
      return {
        ...base,
        widget: 'number',
        value: { kind: 'number', unitSymbol: field.unitSymbol, unitCategory, default: toNumber(field.defaultValue) },
      };
    case 'boolean':
      return {
        ...base,
        widget: 'toggle',
        value: {
          kind: 'boolean',
          default: field.defaultValue === true || field.defaultValue === 'true' || field.defaultValue === 1,
        },
      };
    case 'dropdown':
      return { ...base, widget: 'dropdown', value: convertDropdown(field, createId, warnings) };
    case 'material':
      return {
        ...base,
        widget: 'picker',
        value: {
          kind: 'material',
          category: field.materialCategory || undefined,
          default: typeof field.defaultValue === 'string' && field.defaultValue ? field.defaultValue : undefined,
        },
      };
    case 'labor':
      return {
        ...base,
        widget: 'picker',
        value: {
          kind: 'labor',
          category: field.laborCategory || undefined,
          default: typeof field.defaultValue === 'string' && field.defaultValue ? field.defaultValue : undefined,
        },
      };
    case 'text':
      return {
        ...base,
        widget: 'text',
        value: { kind: 'text', default: field.defaultValue === undefined ? undefined : String(field.defaultValue) },
      };
  }
}

// Turns a module into a calculator with one part: its fields become inputs, its computed
// outputs become steps, and its cost formula becomes the part's cost step. Formulas are kept
// as written, apart from "out.x" becoming the step's name.
export function calculatorFromModule(
  module: CalculationModule,
  options: { createId?: () => string; now?: string } = {}
): ModuleConversion {
  const createId = options.createId ?? generateId;
  const now = options.now ?? new Date().toISOString();
  const warnings: string[] = [];

  const inputs: CalculatorInput[] = [];
  const fieldKeys = new Set<string>();
  for (const field of module.fields) {
    if (!field.variableName) {
      warnings.push(`The field "${field.label || 'Unnamed'}" has no variable name and was left out.`);
      continue;
    }
    if (fieldKeys.has(field.variableName)) {
      warnings.push(`A second field named "${field.variableName}" was left out.`);
      continue;
    }
    fieldKeys.add(field.variableName);
    inputs.push(convertField(field, createId, warnings));
  }

  // Output names become step names. One that clashes with a field gets a new name; later
  // outputs read the output under that bare name, as the module did, while the cost formula
  // reads the field.
  const taken = new Set(fieldKeys);
  const outputKeys = new Map<string, string>();
  const outputs = (module.computedOutputs ?? []).filter((output) => {
    if (!output.variableName) {
      warnings.push(`The output "${output.label || 'Unnamed'}" has no variable name and was left out.`);
      return false;
    }
    return true;
  });
  for (const output of outputs) {
    const key = uniqueKey(output.variableName, taken);
    if (key !== output.variableName) {
      warnings.push(`The output "${output.label}" is now called "${key}", since "${output.variableName}" is also a field.`);
    }
    outputKeys.set(output.variableName, key);
  }

  const part = { id: createId(), name: module.name || 'Part', costStepId: undefined as string | undefined };

  const renameOutputs = (expression: string, earlier: Set<string> | null) =>
    rewriteExpression(expression, (token) => {
      if (token.base === 'out' && token.property && outputKeys.has(token.property)) {
        return outputKeys.get(token.property)!;
      }
      if (earlier && !token.property && !token.isCall && earlier.has(token.base)) {
        return outputKeys.get(token.base)!;
      }
      return null;
    });

  const steps: CalculatorStep[] = [];
  const earlier = new Set<string>();
  for (const output of outputs) {
    steps.push({
      id: createId(),
      partId: part.id,
      key: outputKeys.get(output.variableName)!,
      label: output.label || output.variableName,
      source: { type: 'expression', expression: renameOutputs(output.expression, earlier) },
      unitSymbol: output.unitSymbol,
      unitCategory: output.unitCategory ?? (output.unitSymbol ? getUnitCategory(output.unitSymbol) : undefined),
      format: 'number',
    });
    earlier.add(output.variableName);
  }

  const costStep: CalculatorStep = {
    id: createId(),
    partId: part.id,
    key: uniqueKey('cost', taken),
    label: 'Cost',
    source: { type: 'expression', expression: renameOutputs(module.formula ?? '', null) },
    format: 'money',
  };
  steps.push(costStep);
  part.costStepId = costStep.id;

  const resultItems: LayoutItem[] = steps
    .filter((step) => step !== costStep)
    .map((step) => ({ type: 'result', stepId: step.id, style: 'row' }));
  resultItems.push({ type: 'result', stepId: costStep.id, style: 'headline' });

  const calculator: Calculator = {
    id: createId(),
    name: module.name,
    description: module.description,
    category: module.category,
    inputs,
    parts: [part],
    steps,
    layout: [
      { id: createId(), items: inputs.map((input) => ({ type: 'input', inputId: input.id })) },
      { id: createId(), title: 'Results', items: resultItems },
    ],
    createdAt: now,
    updatedAt: now,
  };
  return { calculator, warnings };
}
