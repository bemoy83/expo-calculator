'use client';

import { analyzeFormulaVariables } from '@/lib/formula-evaluator';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { Field, Material } from '@/lib/types';
import Chip from '@/components/ui/Chip';
import { ComputedOutputVariable, VariableInfo } from './types';

interface FormulaDebugPanelProps {
  formula: string;
  availableFieldVariables: VariableInfo[];
  materials: Material[];
  fields: Field[];
  computedOutputs: ComputedOutputVariable[];
}

function DebugChipGroup({
  title,
  values,
  variant = 'primary',
}: {
  title: string;
  values: string[];
  variant?: React.ComponentProps<typeof Chip>['variant'];
}) {
  return (
    <div>
      <h5 className="text-xs font-semibold text-md-primary mb-1.5">
        {title} ({values.length})
      </h5>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Chip key={value} size="sm" variant={variant} className="font-mono text-xs">
              {value}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="text-xs text-md-on-surface-variant italic">None</p>
      )}
    </div>
  );
}

export function FormulaDebugPanel({
  formula,
  availableFieldVariables,
  materials,
  fields,
  computedOutputs,
}: FormulaDebugPanelProps) {
  const functions = useFunctionsStore((state) => state.functions);
  const computedOutputVars = computedOutputs.map((o) => `out.${o.variableName}`);
  const allAvailableVars = [
    ...availableFieldVariables.map(v => v.name),
    ...computedOutputVars,
  ];

  const debugInfo = analyzeFormulaVariables(
    formula,
    allAvailableVars,
    materials,
    fields.map(f => ({
      variableName: f.variableName,
      type: f.type,
      materialCategory: f.materialCategory,
    })),
    functions
  );

  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold text-md-on-surface-variant hover:text-md-on-surface transition-colors">
        Formula debug (detected variables)
      </summary>
      <div className="mt-3 space-y-3 p-3">
        <DebugChipGroup title="Standalone Variables" values={debugInfo.variables} />

        <div>
          <h5 className="text-xs font-semibold text-md-primary mb-1.5">
            Function Calls ({debugInfo.functionCalls?.length || 0})
          </h5>
          {debugInfo.functionCalls && debugInfo.functionCalls.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {debugInfo.functionCalls.map((call, idx) => (
                <Chip
                  key={`${call.name}-${idx}`}
                  size="sm"
                  variant="primary"
                  className="font-mono text-xs"
                  title={`${call.name}(${call.arguments.join(', ')})`}
                >
                  {call.fullMatch}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-md-on-surface-variant italic">None</p>
          )}
        </div>

        {debugInfo.computedOutputs && debugInfo.computedOutputs.length > 0 && (
          <DebugChipGroup
            title="Computed Outputs"
            values={debugInfo.computedOutputs}
            variant="primaryTonal"
          />
        )}

        <DebugChipGroup title="Unknown Variables" values={debugInfo.unknownVariables} variant="error" />

        <div>
          <h5 className="text-xs font-semibold text-md-primary mb-1.5">
            Field Property References ({debugInfo.fieldPropertyRefs.length})
          </h5>
          {debugInfo.fieldPropertyRefs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {debugInfo.fieldPropertyRefs.map((ref, idx) => (
                <Chip
                  key={`${ref.full}-${idx}`}
                  size="sm"
                  variant="default"
                  className="font-mono text-xs"
                  title={`${ref.fieldVar}.${ref.property}`}
                >
                  {ref.full}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-md-on-surface-variant italic">None</p>
          )}
        </div>

        <div>
          <h5 className="text-xs font-semibold text-md-primary mb-1.5">
            Material Property References ({debugInfo.materialPropertyRefs.length})
          </h5>
          {debugInfo.materialPropertyRefs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {debugInfo.materialPropertyRefs.map((ref, idx) => (
                <Chip
                  key={`${ref.full}-${idx}`}
                  size="sm"
                  variant="default"
                  className="font-mono text-xs"
                  title={`${ref.materialVar}.${ref.property}`}
                >
                  {ref.full}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-md-on-surface-variant italic">None</p>
          )}
        </div>

        {debugInfo.mathFunctions.length > 0 && (
          <DebugChipGroup
            title="Math Functions"
            values={debugInfo.mathFunctions}
            variant="outline"
          />
        )}
      </div>
    </details>
  );
}
