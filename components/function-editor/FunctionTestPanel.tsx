'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { evaluateFunctionSample, getFunctionParamKinds } from '@/lib/functions/function-sample';
import { formatFunctionSignature } from '@/lib/functions/function-usage';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import type { SharedFunction } from '@/lib/types';

interface FunctionTestPanelProps {
  /** The function as currently edited (unsaved values included). */
  draft: Pick<SharedFunction, 'id' | 'name' | 'formula' | 'parameters' | 'returnUnitSymbol'>;
  functions: SharedFunction[];
}

// Try the function with sample numbers, the way a module call evaluates it. Session only.
export function FunctionTestPanel({ draft, functions }: FunctionTestPanelProps) {
  const materials = useMaterialsStore((state) => state.materials);
  const [values, setValues] = useState<Record<string, string>>({});

  const parameters = draft.parameters.filter((param) => param.name);
  const kinds = useMemo(() => getFunctionParamKinds(draft), [draft]);
  // Other functions as saved, plus this one as edited, so calls to it (or recursion) use the draft.
  const availableFunctions = useMemo(
    () => [
      ...functions.filter((func) => func.id !== draft.id && func.name !== draft.name),
      { ...draft, displayName: draft.name, createdAt: '', updatedAt: '' } as SharedFunction,
    ],
    [functions, draft]
  );
  const result = useMemo(
    () => evaluateFunctionSample({ func: draft, values, materials, functions: availableFunctions }),
    [draft, values, materials, availableFunctions]
  );

  return (
    <section
      aria-labelledby="function-test-heading"
      className="rounded-[10px] bg-surface border border-border-strong shadow-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <h2 id="function-test-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Try it
        </h2>
        <span className="text-[11px] text-ink-faint">not saved</span>
      </div>
      <div className="px-4 py-3.5 space-y-3.5">
        <code className="block text-xs font-numeric text-action break-all">{formatFunctionSignature(draft)}</code>
        {parameters.length === 0 ? (
          <p className="text-xs text-ink-muted">Add parameters to try this function with sample values.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-3">
            {parameters.map((param) =>
              kinds[param.name] === 'material' ? (
                <Select
                  key={param.name}
                  label={param.label || param.name}
                  value={values[param.name] ?? ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [param.name]: event.target.value }))}
                  options={[
                    { value: '', label: 'Choose a material…' },
                    ...materials.map((material) => ({ value: material.variableName, label: material.name })),
                  ]}
                />
              ) : (
                <Input
                  key={param.name}
                  label={`${param.label || param.name}${param.unitSymbol ? ` (${param.unitSymbol})` : ''}`}
                  type="number"
                  value={values[param.name] ?? ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [param.name]: event.target.value }))}
                />
              )
            )}
          </div>
        )}
        <div className="border-t border-border pt-3" role="status" aria-live="polite">
          {result.display !== undefined ? (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-ink">Result</span>
              <span className="text-[22px] leading-tight font-semibold font-numeric text-ink">{result.display}</span>
            </div>
          ) : (
            <p className={`text-xs ${result.error?.startsWith('Enter a value') ? 'text-ink-muted' : 'text-danger'}`}>
              {result.error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
