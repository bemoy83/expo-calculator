import { evaluateFormula } from '../formula/evaluator';
import { getLaborValue, getMaterialValue } from '../formula/resolver';
import { convertFromBase, normalizeToBase } from '../units';
import { callFunction, type FunctionArgValue } from './call-function';
import { evaluateCondition, selectedChoiceId } from './conditions';
import { createDependencyScope, getStepDependencies, orderSteps, type StepDependencies } from './dependencies';
import type {
  Binding,
  Calculator,
  CalculatorInput,
  CalculatorLibrary,
  CalculatorResult,
  CalculatorStep,
  CalculatorValues,
  PartResult,
  PartStatus,
  StepResult,
} from './types';
import { isValidName } from '../formula/identifiers';

type Resolved = Record<string, number | boolean | string>;

// The values the math uses: typed values, else defaults. Inputs left out have no usable
// value (a blank number, an unpicked or deleted material). Text notes never reach the math.
export function resolveInputValues(
  calculator: Calculator,
  values: CalculatorValues,
  library: Pick<CalculatorLibrary, 'materials' | 'labor'>
): Resolved {
  const resolved: Resolved = {};
  const materialNames = new Set(library.materials.map((item) => item.variableName));
  const laborNames = new Set(library.labor.map((item) => item.variableName));

  for (const input of calculator.inputs) {
    const raw = values[input.key];
    const spec = input.value;
    switch (spec.kind) {
      case 'number': {
        const typed = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
        if (Number.isFinite(typed)) resolved[input.key] = typed;
        else if (spec.default !== undefined && Number.isFinite(spec.default)) resolved[input.key] = spec.default;
        break;
      }
      case 'boolean':
        resolved[input.key] = typeof raw === 'boolean' ? raw : spec.default ?? false;
        break;
      case 'choice': {
        const id = selectedChoiceId(input, raw);
        const option = spec.options.find((candidate) => candidate.id === id);
        if (option) resolved[input.key] = option.value;
        break;
      }
      case 'material':
      case 'labor': {
        const names = spec.kind === 'material' ? materialNames : laborNames;
        if (typeof raw === 'string' && names.has(raw)) resolved[input.key] = raw;
        else if (spec.default && names.has(spec.default)) resolved[input.key] = spec.default;
        break;
      }
      case 'text':
        break;
    }
  }
  return resolved;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'This step could not be calculated.';
}

// Evaluates every step in dependency order. Problems stay with the step that has them: a
// step missing an input, or reading a step that failed, reports that instead of a value,
// and everything else still calculates. Nothing is evaluated without its values, so an
// unpicked material is reported as missing rather than thrown.
export function evaluateCalculator(
  calculator: Calculator,
  values: CalculatorValues,
  library: CalculatorLibrary
): CalculatorResult {
  const resolved = resolveInputValues(calculator, values, library);
  const inputsByKey = new Map<string, CalculatorInput>(calculator.inputs.map((input) => [input.key, input]));
  const scope = createDependencyScope(calculator, library);
  const pickerFields = calculator.inputs
    .filter((input) => input.value.kind === 'material' || input.value.kind === 'labor')
    .map((input) => ({ variableName: input.key, type: input.value.kind }));

  // A key must name one thing: steps sharing a key with another step or an input can't be
  // told apart, so they don't calculate and steps reading them wait.
  const keyCounts = new Map<string, number>();
  for (const step of calculator.steps) keyCounts.set(step.key, (keyCounts.get(step.key) ?? 0) + 1);
  const keyProblem = (step: CalculatorStep): string | undefined => {
    if (!isValidName(step.key)) return `"${step.key}" isn't a valid name; use letters, digits and _.`;
    if (inputsByKey.has(step.key)) return `The name "${step.key}" is also used by an input.`;
    if ((keyCounts.get(step.key) ?? 0) > 1) return `The name "${step.key}" is used by more than one step.`;
    return undefined;
  };

  const stepsByKey = new Map<string, CalculatorStep>();
  for (const step of calculator.steps) if (!keyProblem(step)) stepsByKey.set(step.key, step);

  const dependencies = new Map<string, StepDependencies>();
  for (const step of calculator.steps) dependencies.set(step.id, getStepDependencies(step, scope));

  const readsOf = new Map<string, string[]>();
  for (const [key, step] of stepsByKey) {
    readsOf.set(key, dependencies.get(step.id)!.steps.filter((read) => stepsByKey.has(read)));
  }
  const { order, cycles, afterCycle } = orderSteps([...stepsByKey.keys()], readsOf);

  const inputOrder = calculator.inputs.map((input) => input.key);
  const results: Record<string, StepResult> = {};
  const byKey = new Map<string, StepResult>();
  const stepValues: Record<string, number> = {};

  const finish = (step: CalculatorStep, result: Omit<StepResult, 'stepId' | 'key'>) => {
    const full: StepResult = { stepId: step.id, key: step.key, ...result };
    if (full.value !== undefined) {
      full.displayValue =
        step.unitSymbol && step.format !== 'money' && !step.unitIsLabel
          ? convertFromBase(full.value, step.unitSymbol)
          : full.value;
      stepValues[step.key] = full.value;
    }
    results[step.id] = full;
    if (stepsByKey.get(step.key) === step) byKey.set(step.key, full);
  };

  const bindingValue = (binding: Binding): FunctionArgValue => {
    switch (binding.type) {
      case 'input':
        return resolved[binding.key];
      case 'step':
        return stepValues[binding.key];
      case 'constant':
        return binding.unitSymbol ? normalizeToBase(binding.value, binding.unitSymbol) : binding.value;
      case 'property': {
        const selected = String(resolved[binding.inputKey]);
        const kind = inputsByKey.get(binding.inputKey)?.value.kind;
        if (kind === 'labor') {
          const item = library.labor.find((candidate) => candidate.variableName === selected);
          const value = item ? getLaborValue(item, binding.property) : null;
          if (value === null) throw new Error(`"${item?.name ?? selected}" has no property "${binding.property}".`);
          return value;
        }
        const item = library.materials.find((candidate) => candidate.variableName === selected);
        const value = item ? getMaterialValue(item, binding.property) : null;
        if (value === null) throw new Error(`"${item?.name ?? selected}" has no property "${binding.property}".`);
        return value;
      }
    }
  };

  const calculate = (step: CalculatorStep): number => {
    if (step.source.type === 'call') {
      const fn = scope.functions.get(step.source.functionName)!;
      const args: Record<string, FunctionArgValue> = {};
      for (const param of fn.parameters) args[param.name] = bindingValue(step.source.args[param.name]);
      return callFunction(fn, args, library);
    }
    return evaluateFormula(step.source.expression, {
      fieldValues: { ...resolved, ...stepValues },
      materials: library.materials,
      labor: library.labor,
      fields: pickerFields,
      functions: library.functions,
    });
  };

  const evaluateStep = (step: CalculatorStep) => {
    const deps = dependencies.get(step.id)!;
    if (deps.errors.length > 0) return finish(step, { status: 'error', message: deps.errors[0] });

    const loop = cycles.get(step.key);
    if (loop) {
      return finish(step, { status: 'error', message: `Circular reference: ${[...loop, loop[0]].join(' → ')}.` });
    }

    if (step.enabledWhen) {
      const outcome = evaluateCondition(step.enabledWhen, inputsByKey, values, resolved);
      if (outcome === 'missing') {
        return finish(step, { status: 'missing', missingInputs: [step.enabledWhen.inputKey] });
      }
      if (!outcome) return finish(step, { status: 'disabled', value: 0 });
    }

    const directMissing = deps.inputs.filter((key) => !(key in resolved));
    const blockedBy = deps.steps.filter((key) => {
      const status = byKey.get(key)?.status;
      return status !== 'ok' && status !== 'disabled';
    });
    // Missing inputs include those the steps it waits on are missing, so a result can say
    // everything it needs, not only what it reads directly.
    const upstreamMissing = new Set(blockedBy.flatMap((key) => byKey.get(key)?.missingInputs ?? []));
    const missingInputs = inputOrder.filter((key) => directMissing.includes(key) || upstreamMissing.has(key));
    if (directMissing.length > 0) {
      return finish(step, { status: 'missing', missingInputs, blockedBy: blockedBy.length ? blockedBy : undefined });
    }
    if (blockedBy.length > 0 || afterCycle.has(step.key)) {
      return finish(step, {
        status: 'blocked',
        blockedBy,
        missingInputs: missingInputs.length > 0 ? missingInputs : undefined,
      });
    }

    try {
      return finish(step, { status: 'ok', value: calculate(step) });
    } catch (error) {
      return finish(step, { status: 'error', message: describeError(error) });
    }
  };

  for (const key of order) evaluateStep(stepsByKey.get(key)!);
  for (const step of calculator.steps) {
    const problem = keyProblem(step);
    if (problem) finish(step, { status: 'error', message: problem });
  }

  // Parts: what each reads, what it's missing, and its cost.
  const parts: Record<string, PartResult> = {};
  for (const part of calculator.parts) {
    const partSteps = calculator.steps.filter((step) => step.partId === part.id);
    const partKeys = new Set(partSteps.map((step) => step.key));
    const reads = new Set<string>();
    const external = new Set<string>();
    const missing = new Set<string>();
    const statuses = new Set<string>();
    for (const step of partSteps) {
      const deps = dependencies.get(step.id)!;
      deps.inputs.forEach((key) => reads.add(key));
      deps.steps.filter((key) => !partKeys.has(key)).forEach((key) => external.add(key));
      results[step.id].missingInputs?.forEach((key) => missing.add(key));
      statuses.add(results[step.id].status);
    }
    const status: PartStatus =
      partSteps.length === 0
        ? 'empty'
        : statuses.has('error')
          ? 'error'
          : statuses.has('missing')
            ? 'missing'
            : statuses.has('blocked')
              ? 'blocked'
              : 'ok';
    const costResult = part.costStepId ? results[part.costStepId] : undefined;
    const cost =
      costResult && (costResult.status === 'ok' || costResult.status === 'disabled') ? costResult.value : undefined;
    parts[part.id] = {
      partId: part.id,
      status,
      inputKeys: inputOrder.filter((key) => reads.has(key)),
      externalStepKeys: [...external],
      missingInputs: inputOrder.filter((key) => missing.has(key)),
      cost,
    };
  }

  const costed = calculator.parts.filter((part) => part.costStepId && results[part.costStepId]);
  const total =
    costed.length > 0 && costed.every((part) => parts[part.id].cost !== undefined)
      ? costed.reduce((sum, part) => sum + parts[part.id].cost!, 0)
      : undefined;

  const quoteStep = calculator.quoteCostStepId ? results[calculator.quoteCostStepId] : undefined;
  const quoteCost = quoteStep
    ? quoteStep.status === 'ok' || quoteStep.status === 'disabled'
      ? quoteStep.value
      : undefined
    : total;

  const allMissing = new Set<string>();
  Object.values(results).forEach((result) => result.missingInputs?.forEach((key) => allMissing.add(key)));

  return {
    steps: results,
    parts,
    total,
    quoteCost,
    resolvedValues: resolved,
    missingInputs: inputOrder.filter((key) => allMissing.has(key)),
  };
}
