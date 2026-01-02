'use client';

import { useCallback } from 'react';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FunctionParameter } from '@/hooks/use-parameter-manager';
import { Trash2 } from 'lucide-react';

interface ParameterItemProps {
  parameter: FunctionParameter;
  index: number;
  isExpanded: boolean;
  parameterError: Record<string, string>;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<FunctionParameter>) => void;
  canRemove: boolean;
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
}: ParameterItemProps) {
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
        </div>
      )}
    </ModuleCardShell>
  );
}
