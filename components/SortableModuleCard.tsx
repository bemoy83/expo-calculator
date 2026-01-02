'use client';

import { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { ActionIconButton } from '@/components/shared/ActionIconButton';
import { QuoteModuleInstance, CalculationModule, Field } from '@/lib/types';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';

interface SortableModuleCardProps {
  instance: QuoteModuleInstance;
  module: CalculationModule;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRemove: (id: string) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
  // Optional props for quotes page
  onAddToQuote?: (id: string) => void;
  addedItems?: Set<string>;
  // Optional styling props
  contentClassName?: string;
  gridClassName?: string;
  borderClassName?: string;
}

export function SortableModuleCard({
  instance,
  module,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  renderFieldInput,
  onAddToQuote,
  addedItems,
  contentClassName = 'px-4 pb-6',
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-5',
  borderClassName = 'border-border',
}: SortableModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transform ? transition : 'none'),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 40 : 'auto',
  };

  // Memoize ref callback to prevent re-creation during drag operations
  // This ensures stable ref handling and prevents visual jumps
  const stableRef = useCallback((el: HTMLDivElement | null) => {
    setNodeRef(el);
  }, [setNodeRef]);

  return (
    <ModuleCardShell
      cardRef={stableRef}
      style={style}
  dragHandleProps={{ attributes, listeners }}
  title={module.name}
  category={module.category}
  subtitle={module.description || undefined}
  isCollapsed={isCollapsed}
  onToggle={() => onToggleCollapse(instance.id)}
      onRemove={() => onRemove(instance.id)}
      removeConfirmMessage={`Remove ${module.name} from quote?`}
      rightExtras={
        <>
          <span className="text-sm font-semibold text-success tabular-nums">
            ${instance.calculatedCost.toFixed(2)}
          </span>
          {onAddToQuote && addedItems && (
            <ActionIconButton
              icon={Plus}
              actionType="custom"
              onAction={() => onAddToQuote(instance.id)}
              ariaLabel={addedItems.has(instance.id) ? 'Added to quote' : 'Add to quote'}
            />
          )}
        </>
      }
    >
      {/* Module Content */}
      {!isCollapsed && (
        <div className={contentClassName}>
          <div className={gridClassName}>
            {module.fields.map((field) => (
              <div key={field.id} className={onAddToQuote ? 'flex flex-col' : ''}>
                {renderFieldInput(instance, field)}
              </div>
            ))}
          </div>

          <div className={`flex items-center justify-between pt-5 border-t ${borderClassName}`}>
            <span className="text-sm font-semibold text-md-on-surface-variant uppercase tracking-wide">Module Cost</span>
            <span className="text-2xl font-bold text-success tabular-nums tracking-tight">
              ${instance.calculatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </ModuleCardShell>
  );
}
