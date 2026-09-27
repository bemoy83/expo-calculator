'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { evaluateFunctionSample, getFunctionParamKinds } from '@/lib/functions/function-sample';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import type { SharedFunction } from '@/lib/types';
import { Field } from '@/components/ui/Field';
import { LiveLabel } from '@/components/live/LiveLabel';

interface FunctionTestPanelProps {
  /** The function as currently edited (unsaved values included). */
  draft: Pick<SharedFunction, 'id' | 'name' | 'formula' | 'parameters' | 'returnUnitSymbol'>;
  functions: SharedFunction[];
}

// Try the function with sample values, the way a calculator step calls it. Session only, not saved.
export function FunctionTestPanel({ draft, functions }: FunctionTestPanelProps) {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
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
    () => evaluateFunctionSample({ func: draft, values, materials, labor, functions: availableFunctions }),
    [draft, values, materials, labor, availableFunctions]
  );

  const unit = draft.returnUnitSymbol;

  // The top of the live pane (mockup 3d): sample values in, the returned value large.
  return (
    <section aria-labelledby="function-test-heading" className="flex flex-col gap-4">
      <h2 id="function-test-heading">
        <LiveLabel context="Test run" />
      </h2>
      {parameters.length === 0 ? (
        <p className="text-[13px] text-ink-muted">Add parameters to try this function with sample values.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {parameters.map((param) => {
            const label = param.label || param.name;
            const set = (value: string) => setValues((prev) => ({ ...prev, [param.name]: value }));
            const kind = kinds[param.name];
            if (kind === 'material' || kind === 'labor') {
              const items: Array<{ variableName: string; name: string }> = kind === 'material' ? materials : labor;
              return (
                <div key={param.name} className="col-span-2">
                  <Select
                    label={label}
                    size="compact"
                    value={values[param.name] ?? ''}
                    onChange={(event) => set(event.target.value)}
                    options={[
                      { value: '', label: kind === 'material' ? 'Choose a material…' : 'Choose labor…' },
                      ...items.map((item) => ({ value: item.variableName, label: item.name })),
                    ]}
                  />
                </div>
              );
            }
            if (kind === 'boolean') {
              return (
                <Select
                  key={param.name}
                  label={label}
                  size="compact"
                  value={values[param.name] ?? 'false'}
                  onChange={(event) => set(event.target.value)}
                  options={[
                    { value: 'false', label: 'No' },
                    { value: 'true', label: 'Yes' },
                  ]}
                />
              );
            }
            return (
              <Field key={param.name} label={label} unit={param.unitSymbol}>
                <Input
                  type="number"
                  size="compact"
                  value={values[param.name] ?? ''}
                  onChange={(event) => set(event.target.value)}
                />
              </Field>
            );
          })}
        </div>
      )}
      <div className="border-t border-border-strong pt-3.5" role="status" aria-live="polite">
        <div className="text-[13px] text-ink-muted">Returns</div>
        {result.display !== undefined ? (
          <div className="font-numeric text-[40px] font-semibold tracking-[-.04em] leading-[1.1] text-accent break-all">
            {unit && result.display.endsWith(` ${unit}`) ? (
              <>
                {result.display.slice(0, -unit.length - 1)}{' '}
                <span className="text-xl text-ink-faint">{unit}</span>
              </>
            ) : (
              result.display
            )}
          </div>
        ) : (
          <p className={`mt-1 text-xs ${/^(Enter|Choose) a value/.test(result.error ?? '') ? 'text-ink-muted' : 'text-danger'}`}>
            {result.error}
          </p>
        )}
      </div>
    </section>
  );
}
