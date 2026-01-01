'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
import { ChevronDown, ChevronRight, Trash2, GripVertical } from 'lucide-react';
import type { QuoteModuleInstance, Material, CalculationModule } from '@/lib/types';

/**
 * SortableModuleInstance Component
 *
 * Sortable card displaying a module instance within a template.
 * Features drag-to-reorder, collapsible field inputs, and delete functionality.
 */

export interface SortableModuleInstanceProps {
  instance: QuoteModuleInstance;
  module: CalculationModule | undefined;
  isExpanded: boolean;
  onToggleExpanded: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  onFieldValueChange: (instanceId: string, fieldName: string, value: any) => void;
  materials: Material[];
  // Field linking props from use-template-editor hook
  workspaceModules: QuoteModuleInstance[];
  isFieldLinked?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getResolvedValue?: (instance: QuoteModuleInstance, fieldName: string) => any;
  isLinkBroken?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getLinkDisplayName?: (instance: QuoteModuleInstance, fieldName: string) => string;
  buildLinkOptions?: (instance: QuoteModuleInstance, field: { variableName: string; type: any }) => Array<{ value: string; label: string }>;
  getCurrentLinkValue?: (instance: QuoteModuleInstance, fieldName: string) => string;
  onLinkField?: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => void;
  onUnlinkField?: (instanceId: string, fieldName: string) => void;
}

export function SortableModuleInstance({
  instance,
  module,
  isExpanded,
  onToggleExpanded,
  onRemove,
  onFieldValueChange,
  materials,
  workspaceModules,
  isFieldLinked,
  getResolvedValue,
  isLinkBroken,
  getLinkDisplayName,
  buildLinkOptions,
  getCurrentLinkValue,
  onLinkField,
  onUnlinkField,
}: SortableModuleInstanceProps) {
  // Track which link UIs are open
  const [openLinkUIs, setOpenLinkUIs] = useState<Set<string>>(new Set());
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
    zIndex: isDragging ? 30 : 'auto',
  };

  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      onFieldValueChange(instance.id, fieldName, value);
    },
    [instance.id, onFieldValueChange]
  );

  // Toggle link UI for a specific field
  const toggleLinkUI = useCallback((fieldName: string) => {
    setOpenLinkUIs((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  }, []);

  // Handle link change from dropdown
  const handleLinkChange = useCallback(
    (fieldName: string, value: string) => {
      if (!onLinkField || !onUnlinkField) return;

      if (value === 'none') {
        onUnlinkField(instance.id, fieldName);
      } else {
        const [targetInstanceId, targetFieldName] = value.split('.');
        if (targetInstanceId && targetFieldName) {
          onLinkField(instance.id, fieldName, targetInstanceId, targetFieldName);
        }
      }
    },
    [instance.id, onLinkField, onUnlinkField]
  );

  // Handle unlink
  const handleUnlink = useCallback(
    (fieldName: string) => {
      if (!onUnlinkField) return;
      onUnlinkField(instance.id, fieldName);
    },
    [instance.id, onUnlinkField]
  );

  if (!module) {
    return (
      <Card ref={setNodeRef} style={style} variant="default">
        <div className="p-4 text-md-on-surface-variant">
          Module not found
        </div>
      </Card>
    );
  }

  return (
    <Card ref={setNodeRef} style={style} variant="default">
      {/* Module Header */}
      <div className="flex items-center">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-md-on-surface-variant hover:text-md-primary cursor-grab active:cursor-grabbing focus:outline-none transition-smooth"
          aria-label={`Drag to reorder ${module.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Module Content */}
        <div
          className="flex items-center justify-between flex-1 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-extra-large"
          onClick={() => onToggleExpanded(instance.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpanded(instance.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} module ${module.name}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-md-primary">
                {module.name}
              </span>
              {module.category && (
                <Chip size="sm" variant="default">
                  {module.category}
                </Chip>
              )}
              <Chip size="sm" variant="primary" className="font-mono">
                {module.fields.length} {module.fields.length === 1 ? 'field' : 'fields'}
              </Chip>
            </div>
            {module.description && (
              <p className="text-sm text-md-on-surface-variant mt-1.5 truncate">
                {module.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove ${module.name} from template?`)) {
                  onRemove(instance.id);
                }
              }}
              className="p-2 text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container/10 rounded-full transition-smooth active:scale-95"
              aria-label={`Remove ${module.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Field Inputs */}
      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {module.fields.map((field) => {
            // Determine if field can be linked (not material type)
            const canLink = field.type !== 'material' && workspaceModules.length > 1;

            // Check if field is linked
            const isLinkedToValue = isFieldLinked ? isFieldLinked(instance, field.variableName) : false;

            // Get display value (resolved from link or direct value)
            const displayValue = getResolvedValue
              ? getResolvedValue(instance, field.variableName)
              : instance.fieldValues[field.variableName];

            // Build link props if linking is available
            const linkProps = canLink && isFieldLinked && getLinkDisplayName && buildLinkOptions && getCurrentLinkValue && isLinkBroken
              ? {
                  canLink: true,
                  isLinked: isLinkedToValue,
                  isLinkBroken: isLinkBroken(instance, field.variableName),
                  linkDisplayName: getLinkDisplayName(instance, field.variableName),
                  linkUIOpen: openLinkUIs.has(field.variableName),
                  currentLinkValue: getCurrentLinkValue(instance, field.variableName),
                  linkOptions: buildLinkOptions(instance, field),
                  onToggleLink: () => toggleLinkUI(field.variableName),
                  onLinkChange: (value: string) => handleLinkChange(field.variableName, value),
                  onUnlink: () => handleUnlink(field.variableName),
                }
              : undefined;

            return (
              <ModuleFieldInput
                key={field.id}
                field={field}
                value={displayValue}
                materials={materials}
                onChange={(value) => {
                  // Don't allow direct editing if field is linked
                  if (linkProps?.isLinked) return;
                  handleFieldChange(field.variableName, value);
                }}
                linkProps={linkProps}
              />
            );
          })}

          {module.fields.length === 0 && (
            <p className="text-sm text-md-on-surface-variant italic">
              This module has no input fields
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
