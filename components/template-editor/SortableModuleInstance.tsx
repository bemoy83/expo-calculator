'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Chip } from '@/components/ui/Chip';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
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
        // Split only on the first dot to handle computed outputs with 'out.' prefix
        const firstDotIndex = value.indexOf('.');
        if (firstDotIndex === -1) return;
        
        const targetInstanceId = value.substring(0, firstDotIndex);
        const targetFieldName = value.substring(firstDotIndex + 1);
        
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

  // Build metachips: field count + computed outputs + link count
  const metaChips = useMemo(() => {
    const chips: React.ReactNode[] = [];

    // Early return if module is undefined
    if (!module) {
      return chips;
    }

    // Field count chip
    chips.push(
      <Chip key="field-count" size="sm" variant="primaryTonal" className="font-mono">
        {module.fields.length} {module.fields.length === 1 ? 'field' : 'fields'}
      </Chip>
    );

    // Computed output chips
    if (module.computedOutputs && module.computedOutputs.length > 0) {
      module.computedOutputs.forEach((output) => {
        chips.push(
          <Chip key={output.id} size="sm" variant="flat">
            {output.label}
            {output.unitSymbol && (
              <span className="ml-1 text-xs opacity-70">({output.unitSymbol})</span>
            )}
          </Chip>
        );
      });
    }

    // Link count chip
    const linkCount = Object.keys(instance.fieldLinks || {}).length;
    if (linkCount > 0) {
      chips.push(
        <Chip key="link-count" size="sm" variant="outline">
          {linkCount} {linkCount === 1 ? 'link' : 'links'}
        </Chip>
      );
    }

    return chips;
  }, [module, instance.fieldLinks]);

  if (!module) {
    return (
      <ModuleCardShell
        cardRef={setNodeRef}
        style={style}
        dragHandleProps={{ attributes, listeners }}
        title="Module not found"
        isCollapsed={true}
        onToggle={() => {}}
      >
        <div className="p-4 text-md-on-surface-variant">
          Module not found
        </div>
      </ModuleCardShell>
    );
  }

  return (
    <ModuleCardShell
      cardRef={setNodeRef}
      style={style}
      dragHandleProps={{ attributes, listeners }}
      title={module.name}
      category={module.category}
      metaChips={metaChips}
      subtitle={module.description || undefined}
      isCollapsed={!isExpanded}
      onToggle={() => onToggleExpanded(instance.id)}
      onRemove={() => onRemove(instance.id)}
      removeConfirmMessage={`Remove ${module.name} from template?`}
    >
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
    </ModuleCardShell>
  );
}
