'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, ChevronRight, ChevronLeft, GripVertical, Trash2, Plus } from 'lucide-react';
import { QuoteModuleInstance, CalculationModule, Field } from '@/lib/types';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';

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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      variant="default"
    >
      {/* Module Header */}
      <div className="flex items-center">
        {/* Drag Handle - Left Side */}
        <button
          {...attributes}
          {...listeners}
          className="text-md-on-surface-variant hover:text-md-primary cursor-grab active:cursor-grabbing focus:outline-none transition-smooth"
          aria-label={`Drag to reorder ${module.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Interactive Header Content */}
        <div
          className="flex items-center justify-between flex-1 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-extra-large"
          onClick={() => onToggleCollapse(instance.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse(instance.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} module ${module.name}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-md-primary">
                {module.name}
              </span>
              {module.category && (
                <Chip size="sm">
                  {module.category}
                </Chip>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-success tabular-nums">
              ${instance.calculatedCost.toFixed(2)}
            </span>
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-md-on-surface-variant" />
            ) : (
                <ChevronDown className="h-5 w-5 text-md-on-surface-variant" />
            )}
            {/* Action Buttons - Right Aligned */}
            {onAddToQuote && addedItems && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToQuote(instance.id);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-md-primary text-md-on-primary hover:bg-md-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-md-primary focus:ring-offset-2 focus:ring-offset-md-surface"
                aria-label={addedItems.has(instance.id) ? 'Added to quote' : 'Add to quote'}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(instance.id);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-md-error text-md-on-error hover:bg-md-error/90 transition-colors focus:outline-none focus:ring-2 focus:ring-md-error focus:ring-offset-2 focus:ring-offset-md-surface"
              aria-label="Remove module"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Module Content */}
      {!isCollapsed && (
        <div className={contentClassName}>
          {module.description && (
            <p className="text-sm text-md-on-surface-variant mb-5">{module.description}</p>
          )}
          
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
    </Card>
  );
}

