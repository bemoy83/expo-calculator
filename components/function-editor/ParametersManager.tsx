'use client';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { ParameterItem } from './ParameterItem';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { getFunctionParamKinds } from '@/lib/functions/param-kinds';

interface ParametersManagerProps {
  parameters: FunctionParameter[];
  expandedParameters: Set<string>;
  parameterErrors: Record<number, Record<string, string>>;
  onToggleExpanded: (index: number) => void;
  onUpdateParameter: (index: number, updates: Partial<FunctionParameter>) => void;
  onRemoveParameter: (index: number) => void;
  onAddParameter: () => void;
  /** The function's formula, to show what each parameter is taken to be when no kind is set. */
  formula?: string;
}

export function ParametersManager({
  parameters,
  expandedParameters,
  parameterErrors,
  onToggleExpanded,
  onUpdateParameter,
  onRemoveParameter,
  onAddParameter,
  formula = '',
}: ParametersManagerProps) {
  const inferredKinds = getFunctionParamKinds({
    formula,
    parameters: parameters.map((parameter) => ({ ...parameter, kind: undefined })),
  });
  return (
    <section aria-labelledby="parameters-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow as="h3" id="parameters-heading">
          Parameters
        </Eyebrow>
        <button
          type="button"
          onClick={onAddParameter}
          aria-label="Add parameter"
          className="font-numeric text-xs tracking-[.06em] text-ink hover:text-ink-muted rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          + Add
        </button>
      </div>

      {parameters.length === 0 ? (
        <p className="px-4 py-6 rounded-row border border-dashed border-border-strong text-center text-[13px] text-ink-muted">
          Parameters are the inputs a call passes in, in order. Each one becomes a variable in the formula.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {parameters.map((parameter, index) => {
            const paramKey = `param-${index}`;
            const isExpanded = expandedParameters.has(paramKey);
            const parameterError = parameterErrors[index] || {};

            return (
              <ParameterItem
                key={index}
                parameter={parameter}
                index={index}
                isExpanded={isExpanded}
                parameterError={parameterError}
                onToggle={() => onToggleExpanded(index)}
                onRemove={() => onRemoveParameter(index)}
                onUpdate={(updates) => onUpdateParameter(index, updates)}
                canRemove={true}
                inferredKind={inferredKinds[parameter.name]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

