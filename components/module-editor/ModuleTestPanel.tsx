'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
import { evaluateModuleSample, getSampleDefaults, type SampleValues } from '@/lib/modules/module-sample';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import type { ComputedOutput, Field, Labor, Material } from '@/lib/types';

interface ModuleTestPanelProps {
  fields: Field[];
  formula: string;
  computedOutputs: ComputedOutput[];
  materials: Material[];
  labor: Labor[];
}

// Always-visible test bench for the module being edited: sample inputs (the same inputs a
// quote uses) and, live, the cost, every computed output, and the calculator's error.
// Session only: samples start from field defaults and are never saved. Only the values the
// user changed are kept, so added, removed, or re-defaulted fields stay in step.
export function ModuleTestPanel({ fields, formula, computedOutputs, materials, labor }: ModuleTestPanelProps) {
  const functions = useFunctionsStore((state) => state.functions);
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [overrides, setOverrides] = useState<SampleValues>({});

  const sampleFields = useMemo(() => fields.filter((field) => field.variableName), [fields]);
  const values = useMemo(() => {
    const defaults = getSampleDefaults(sampleFields, materials, labor);
    const kept = Object.fromEntries(Object.entries(overrides).filter(([name]) => name in defaults));
    return { ...defaults, ...kept };
  }, [sampleFields, materials, labor, overrides]);

  const result = useMemo(
    () => evaluateModuleSample({ fields: sampleFields, formula, computedOutputs, values, materials, labor, functions }),
    [sampleFields, formula, computedOutputs, values, materials, labor, functions]
  );

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <section
      aria-labelledby="module-test-heading"
      className="rounded-[10px] bg-surface border border-border-strong shadow-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <h2 id="module-test-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Test with sample values
        </h2>
        <span className="text-[11px] text-ink-faint">not saved</span>
        {hasOverrides && (
          <button
            type="button"
            onClick={() => setOverrides({})}
            className="ml-auto inline-flex items-center gap-1 px-1.5 py-1 rounded text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      <div className="px-4 py-3.5 space-y-3.5">
        {sampleFields.length === 0 ? (
          <p className="text-xs text-ink-muted">Add input fields to test this module with sample values.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-3.5 items-start">
            {sampleFields.map((field) => (
              <ModuleFieldInput
                key={field.id}
                field={field}
                value={values[field.variableName]}
                materials={materials}
                labor={labor}
                onChange={(value) => setOverrides((prev) => ({ ...prev, [field.variableName]: value }))}
              />
            ))}
          </div>
        )}

        {result.outputs.length > 0 && (
          <ul className="border-t border-border pt-3 space-y-1.5" aria-label="Computed outputs">
            {result.outputs.map((output) => (
              <li key={output.id} className="flex items-baseline gap-2 text-xs">
                <span className="text-ink-body">{output.label}</span>
                <code className="font-numeric text-action">out.{output.variableName}</code>
                {output.showInQuote && (
                  <span className="px-1.5 rounded-full bg-committed-bg text-[10px] font-medium text-committed">in quote</span>
                )}
                <span className="ml-auto font-numeric font-medium text-ink">{output.display ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border pt-3" role="status" aria-live="polite">
          {result.cost !== undefined ? (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-ink">Module cost</span>
              <span className="text-[22px] leading-tight font-semibold font-numeric text-committed">
                {formatCurrency(result.cost)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-danger">{result.error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
