'use client';

import { Button } from '@/components/ui/Button';
import { SectionBar } from '@/components/module-editor/SectionBar';
import { ParameterItem } from './ParameterItem';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { getFunctionParamKinds } from '@/lib/functions/param-kinds';
import { Plus } from 'lucide-react';

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
    <section aria-labelledby="parameters-heading" className="space-y-3">
      <SectionBar
        id="parameters-heading"
        title="Parameters"
        count={parameters.length}
        action={
          <Button variant="secondary" size="sm" onClick={onAddParameter}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add parameter
          </Button>
        }
      />

      {parameters.length === 0 ? (
        <p className="px-4 py-6 rounded-[10px] border border-dashed border-border-strong text-center text-sm text-ink-muted">
          Parameters are the inputs a call passes in, in order. Each one becomes a variable in the formula.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
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

