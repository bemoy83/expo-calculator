'use client';

import { useState } from 'react';
import { SortableList } from '@/components/shared/SortableList';
import { SortableModuleInstance } from './SortableModuleInstance';
import type { QuoteModuleInstance, CalculationModule, Material, Labor } from '@/lib/types';

/**
 * ModuleInstancesManager Component
 *
 * Manages the list of module instances in a template.
 * Supports drag-to-reorder, field value editing, and field linking.
 */

export interface ModuleInstancesManagerProps {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  materials: Material[];
  labor?: Labor[];
  onRemoveModule: (instanceId: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onFieldValueChange: (instanceId: string, fieldName: string, value: any) => void;
  // Field linking props from use-template-editor hook
  isFieldLinked?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getResolvedValue?: (instance: QuoteModuleInstance, fieldName: string) => any;
  isLinkBroken?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getLinkDisplayName?: (instance: QuoteModuleInstance, fieldName: string) => string;
  buildLinkOptions?: (instance: QuoteModuleInstance, field: { variableName: string; type: any }) => Array<{ value: string; label: string }>;
  getCurrentLinkValue?: (instance: QuoteModuleInstance, fieldName: string) => string;
  onLinkField?: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => void;
  onUnlinkField?: (instanceId: string, fieldName: string) => void;
}

export function ModuleInstancesManager({
  workspaceModules,
  modules,
  materials,
  labor,
  onRemoveModule,
  onReorder,
  onFieldValueChange,
  isFieldLinked,
  getResolvedValue,
  isLinkBroken,
  getLinkDisplayName,
  buildLinkOptions,
  getCurrentLinkValue,
  onLinkField,
  onUnlinkField,
}: ModuleInstancesManagerProps) {
  // Track expanded state for each module instance
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (instanceId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Module Instances
        </h2>
      </div>

      <SortableList
        items={workspaceModules}
        onReorder={onReorder}
        className="flex flex-col gap-4"
        renderItem={(instance) => {
          const foundModule = modules.find((m) => m.id === instance.moduleId);
          return (
            <SortableModuleInstance
              key={instance.id}
              instance={instance}
              module={foundModule}
              isExpanded={expandedIds.has(instance.id)}
              onToggleExpanded={handleToggleExpanded}
              onRemove={onRemoveModule}
              onFieldValueChange={onFieldValueChange}
              materials={materials}
              labor={labor}
              workspaceModules={workspaceModules}
              isFieldLinked={isFieldLinked}
              getResolvedValue={getResolvedValue}
              isLinkBroken={isLinkBroken}
              getLinkDisplayName={getLinkDisplayName}
              buildLinkOptions={buildLinkOptions}
              getCurrentLinkValue={getCurrentLinkValue}
              onLinkField={onLinkField}
              onUnlinkField={onUnlinkField}
            />
          );
        }}
      />
    </div>
  );
}
