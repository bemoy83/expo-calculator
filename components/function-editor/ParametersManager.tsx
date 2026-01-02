'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ParameterItem } from './ParameterItem';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { Plus } from 'lucide-react';

interface ParametersManagerProps {
  parameters: FunctionParameter[];
  expandedParameters: Set<string>;
  parameterErrors: Record<number, Record<string, string>>;
  onToggleExpanded: (index: number) => void;
  onUpdateParameter: (index: number, updates: Partial<FunctionParameter>) => void;
  onRemoveParameter: (index: number) => void;
  onAddParameter: () => void;
}

export function ParametersManager({
  parameters,
  expandedParameters,
  parameterErrors,
  onToggleExpanded,
  onUpdateParameter,
  onRemoveParameter,
  onAddParameter,
}: ParametersManagerProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Parameters</h2>
      </div>

      {parameters.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-sm text-md-on-surface-variant mb-3">
              Parameters define the inputs required for your function. Each parameter becomes a variable you can use in your formula.
            </p>
            <Button size="sm" onClick={onAddParameter} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Parameter
            </Button>
          </div>
        </Card>
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
                canRemove={parameters.length > 1}
              />
            );
          })}
          <Button variant="ghost" onClick={onAddParameter} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Parameter
          </Button>
        </div>
      )}
    </div>
  );
}


