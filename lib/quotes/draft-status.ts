import { calculateModuleInstance } from '../calculations/module-calculator';
import { formatDisplayNumber } from '../utils';
import type { CalculationModule, Labor, Material, QuoteModuleInstance, SharedFunction } from '../types';
import { buildLineItemSummaries } from './line-item-summary';

export interface DraftOutput {
  variableName: string;
  label: string;
  /** Formatted value with its unit, e.g. "45 m2". */
  display: string;
}

export interface DraftStatus {
  cost: number;
  /** Set when the draft can't calculate (so it can't be locked in); the calculator's message. */
  error?: string;
  /** Required fields that are neither linked nor filled in. */
  missingRequired: number;
  /** Computed outputs marked "show in quote", as they'd appear on the line item. */
  outputs: DraftOutput[];
  /** One-line summary for a collapsed draft, from the same builder as line items. */
  summary?: string;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

// Calculates a workspace draft the same way committing it would, for display: its cost,
// whether it can be locked in, its visible computed outputs, and a summary line.
export function getDraftStatus(input: {
  instance: QuoteModuleInstance;
  moduleDef: CalculationModule;
  /** The draft's field values with links resolved (resolveFieldLinksWithMetadata). */
  resolvedFieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  labor: Labor[];
  functions: SharedFunction[];
}): DraftStatus {
  const { instance, moduleDef, resolvedFieldValues, materials } = input;
  const calculation = calculateModuleInstance({
    moduleDef,
    fieldValues: resolvedFieldValues,
    materials,
    labor: input.labor,
    functions: input.functions,
  });

  const missingRequired = moduleDef.fields.filter(
    (field) =>
      field.required &&
      !instance.fieldLinks?.[field.variableName] &&
      isEmpty(resolvedFieldValues[field.variableName])
  ).length;

  const outputs = (moduleDef.computedOutputs ?? [])
    .filter((output) => output.showInQuote)
    .flatMap((output) => {
      const value = calculation.fieldValues[`out.${output.variableName}`];
      if (value === undefined || value === null) return [];
      const formatted = typeof value === 'number' ? formatDisplayNumber(value) : String(value);
      return [
        {
          variableName: output.variableName,
          label: output.label,
          display: output.unitSymbol ? `${formatted} ${output.unitSymbol}` : formatted,
        },
      ];
    });

  const summaries = buildLineItemSummaries({
    moduleDef,
    resolvedFieldValues,
    fieldValuesWithComputed: calculation.fieldValues,
    materials,
  });
  const summary =
    [summaries.primarySummary, summaries.secondarySummary].filter(Boolean).join(' · ') ||
    summaries.fieldSummary ||
    undefined;

  const hasError = calculation.errors.length > 0;
  return {
    cost: hasError ? 0 : calculation.cost,
    error: hasError ? calculation.errors[0].message : undefined,
    missingRequired,
    outputs,
    summary,
  };
}
