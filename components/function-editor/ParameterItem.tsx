'use client';

import { useId } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import type { FunctionParamKind } from '@/lib/types';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { cn } from '@/lib/utils';

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
  const id = useId();
  const label = parameter.label || `Parameter ${index + 1}`;

  // Closed: a sunken row of name · label · unit (mockup 3d). Open: the same row over its fields.
  return (
    <div
      className={cn(
        'rounded-md border bg-sunken transition-[border-color,box-shadow] duration-150',
        isExpanded ? 'border-accent shadow-focus' : 'border-border-strong'
      )}
    >
      <div className="flex items-center gap-2 pr-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`${id}-fields`}
          aria-label={`${label}, parameter ${index + 1}`}
          className="flex-1 min-w-0 grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_64px] gap-2.5 items-center px-3 py-2.5 text-left text-sm rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          )}
          <span className="font-numeric text-token-input truncate">{parameter.name || '—'}</span>
          <span className="text-ink truncate">{label}</span>
          <span className="font-numeric text-ink-muted text-right truncate">
            {kind === 'number' ? parameter.unitSymbol ?? '' : kind === 'boolean' ? 'yes/no' : kind}
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove parameter ${label}`}
            className="row-action p-1.5 rounded text-ink-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {isExpanded && (
        <div id={`${id}-fields`} className="px-3 pb-3.5 pt-3 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Label"
              value={parameter.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              error={parameterError.label}
              placeholder="e.g., Width"
            />
            <Input
              label="Name in the formula"
              value={parameter.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              error={parameterError.name}
              placeholder="e.g., width"
              numeric
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
    </div>
  );
}
