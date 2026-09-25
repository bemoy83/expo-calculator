'use client';

import { useCallback } from 'react';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import type { FunctionParamKind } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { Trash2 } from 'lucide-react';

const KIND_OPTIONS: Array<{ value: FunctionParamKind | ''; label: string }> = [
  { value: '', label: 'Automatic' },
  { value: 'number', label: 'Number' },
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'boolean', label: 'Yes / no' },
];

interface ParameterItemProps {
  parameter: FunctionParameter;
  index: number;
  isExpanded: boolean;
  parameterError: Record<string, string>;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<FunctionParameter>) => void;
  canRemove: boolean;
  /** The kind the formula implies, shown when none is chosen. */
  inferredKind?: FunctionParamKind;
}

export function ParameterItem({
  parameter,
  index,
  isExpanded,
  parameterError,
  onToggle,
  onRemove,
  onUpdate,
  canRemove,
  inferredKind,
}: ParameterItemProps) {
  const kind = parameter.kind ?? inferredKind ?? 'number';
  const cardRef = useCallback((el: HTMLDivElement | null) => {
    return el;
  }, []);

  const dragHandleProps = {
    attributes: {
      tabIndex: -1,
      'aria-hidden': true,
      style: { visibility: 'hidden' as const, pointerEvents: 'none' as const },
    },
    listeners: {},
  };

  return (
    <ModuleCardShell
      cardRef={cardRef}
      dragHandleProps={dragHandleProps}
      title={parameter.label || `Parameter ${index + 1}`}
      metaChips={[
        <span key="position" className="text-[11px] font-numeric text-ink-faint">#{index + 1}</span>,
        parameter.name ? (
          <span key="name" className="px-2 py-0.5 rounded-full bg-action-bg text-[11px] font-numeric font-medium text-action">
            {parameter.name}
          </span>
        ) : null,
        parameter.unitSymbol ? (
          <span key="unit" className="text-[11px] font-numeric text-ink-muted">{parameter.unitSymbol}</span>
        ) : null,
      ].filter(Boolean)}
      isCollapsed={!isExpanded}
      onToggle={onToggle}
      onRemove={canRemove ? onRemove : undefined}
    >
      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Label"
              value={parameter.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              error={parameterError.label}
              placeholder="e.g., Width"
            />
            <Input
              label="Variable Name"
              value={parameter.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              error={parameterError.name}
              placeholder="e.g., width"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Expects"
              value={parameter.kind ?? ''}
              options={KIND_OPTIONS.map((option) =>
                option.value === '' && inferredKind ? { ...option, label: `${option.label} (${inferredKind})` } : option
              )}
              onChange={(e) => {
                const next = (e.target.value || undefined) as FunctionParamKind | undefined;
                onUpdate(
                  next && next !== 'number' ? { kind: next, unitSymbol: undefined, unitCategory: undefined } : { kind: next }
                );
              }}
            />
            {kind === 'number' && (
              <Select
                label="Unit"
                value={parameter.unitSymbol ?? ''}
                options={[{ value: '', label: 'No unit' }, ...getAllUnitSymbols().map((symbol) => ({ value: symbol, label: symbol }))]}
                onChange={(e) =>
                  onUpdate({
                    unitSymbol: e.target.value || undefined,
                    unitCategory: e.target.value ? getUnitCategory(e.target.value) : undefined,
                  })
                }
              />
            )}
          </div>
          <p className="text-xs text-ink-muted">
            Calculators offer only matching inputs for this parameter, and a number typed for it is read in its unit.
          </p>
        </div>
      )}
    </ModuleCardShell>
  );
}
