'use client';

import { useMemo, useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useSettledValue } from '@/hooks/use-settled-value';
import { evaluateFunctionSample, getFunctionParamKinds } from '@/lib/functions/function-sample';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import type { FunctionParamKind, SharedFunction } from '@/lib/types';
import { cn } from '@/lib/utils';

type Draft = Pick<SharedFunction, 'id' | 'name' | 'formula' | 'parameters' | 'returnUnitSymbol'>;
type Parameter = SharedFunction['parameters'][number];

/**
 * Trying a function with sample values, the way a calculator step calls it. Session only,
 * not saved. `draft` is the function as it stands (unsaved edits included).
 */
export function useFunctionTryIt(draft: Draft, functions: SharedFunction[]) {
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
  const setValue = (name: string, value: string) => setValues((prev) => ({ ...prev, [name]: value }));

  return { parameters, kinds, values, setValue, result };
}

/** Sample inputs, two to a row; materials and labor take the whole row. */
export function FunctionTryInputs({
  parameters,
  kinds,
  values,
  onChange,
}: {
  parameters: Parameter[];
  kinds: Record<string, FunctionParamKind>;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      {parameters.map((param) => {
        const label = param.label || param.name;
        const kind = kinds[param.name];
        if (kind === 'material' || kind === 'labor') {
          const items: Array<{ variableName: string; name: string }> = kind === 'material' ? materials : labor;
          return (
            <div key={param.name} className="col-span-2">
              <Select
                label={label}
                size="compact"
                value={values[param.name] ?? ''}
                onChange={(event) => onChange(param.name, event.target.value)}
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
              onChange={(event) => onChange(param.name, event.target.value)}
              options={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes' },
              ]}
            />
          );
        }
        return (
          <Field key={param.name} label={label} unit={param.unitSymbol} className="min-w-0">
            <Input
              type="number"
              size="compact"
              value={values[param.name] ?? ''}
              onChange={(event) => onChange(param.name, event.target.value)}
            />
          </Field>
        );
      })}
    </div>
  );
}

/** The returned value with its unit split off; or what's still needed, or the error. */
export function splitReturn(display: string, unit?: string): { value: string; unit?: string } {
  return unit && display.endsWith(` ${unit}`) ? { value: display.slice(0, -unit.length - 1), unit } : { value: display };
}

// The top of the editor's live pane (mockup 2a): every parameter as a sample input, then what
// the function returns, large.
export function FunctionTestPanel({
  draft,
  functions,
  unresolved = false,
}: {
  draft: Draft;
  functions: SharedFunction[];
  /** The formula only misses names (a parameter to create): it's incomplete, not wrong */
  unresolved?: boolean;
}) {
  const { parameters, kinds, values, setValue, result } = useFunctionTryIt(draft, functions);
  const shown = result.display !== undefined ? splitReturn(result.display, draft.returnUnitSymbol) : undefined;
  // A formula mistake is spelled out under the formula; here it's just "Error", and only once it
  // has stood for a moment, so a half-typed formula reads as incomplete.
  const settledMistake = useSettledValue(result.short ? result.error : undefined);
  const mistakeShown = !!result.short && settledMistake === result.error && !unresolved;

  return (
    <section aria-labelledby="function-test-heading" className="flex flex-col">
      <Eyebrow as="h2" id="function-test-heading">
        Test run
      </Eyebrow>
      <div className="mt-4">
        {parameters.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Add parameters to try this function with sample values.</p>
        ) : (
          <FunctionTryInputs parameters={parameters} kinds={kinds} values={values} onChange={setValue} />
        )}
      </div>
      <div className="mt-[18px] pt-3.5 border-t border-dashed border-border-strong" role="status" aria-live="polite">
        <div className="text-[13px] text-ink-muted">Returns</div>
        {shown ? (
          <div className="flex items-baseline gap-2">
            <span className="font-numeric text-[40px] font-semibold tracking-[-.04em] leading-[1.1] text-accent break-all">
              {shown.value}
            </span>
            {shown.unit && <span className="font-numeric text-sm text-ink-faint">{shown.unit}</span>}
          </div>
        ) : result.short ? (
          <p
            className={cn('mt-1 text-xs', mistakeShown ? 'text-danger' : 'text-draft')}
            title={mistakeShown ? result.error : undefined}
          >
            {mistakeShown ? result.short : 'Incomplete'}
          </p>
        ) : (
          <p className={cn('mt-1 text-xs', /^(Enter|Choose) a value|^Add a formula/.test(result.error ?? '') ? 'text-ink-muted' : 'text-danger')}>
            {result.error}
          </p>
        )}
      </div>
    </section>
  );
}
