'use client';

import { useState, useMemo } from 'react';
import { SortableList } from '@/components/shared/SortableList';
import { SortableModuleCard } from '@/components/SortableModuleCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { QuoteModuleInstance, CalculationModule, Field } from '@/lib/types';
import { Package } from 'lucide-react';

/**
 * WorkspaceModulesManager Component
 *
 * Manages the list of workspace module instances in a quote.
 * Supports drag-to-reorder, field value editing, and adding to quote.
 * Follows the same pattern as ModuleInstancesManager and FieldsManager.
 */

export interface WorkspaceModulesManagerProps {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  collapsedModules: Set<string>;
  onToggleCollapse: (id: string) => void;
  onRemoveModule: (id: string) => void;
  onAddLineItem?: (id: string) => void;
  addedItems?: Set<string>;
  onReorder: (oldIndex: number, newIndex: number) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
  emptyStateAction?: React.ReactNode;
}

export function WorkspaceModulesManager({
  workspaceModules,
  modules,
  collapsedModules,
  onToggleCollapse,
  onRemoveModule,
  onAddLineItem,
  addedItems,
  onReorder,
  renderFieldInput,
  emptyStateAction,
}: WorkspaceModulesManagerProps) {
  // Memoize module lookups to prevent unnecessary re-renders during drag operations
  // This ensures stable references and prevents visual jumps when reordering
  const moduleMap = useMemo(() => {
    const map = new Map<string, CalculationModule>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Workspace
        </h2>
        <p className="text-sm text-md-on-surface-variant">
          {workspaceModules.length} {workspaceModules.length === 1 ? 'module' : 'modules'}
        </p>
      </div>

      {workspaceModules.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Modules in Workspace"
          description="Add calculation modules to build your quote. Your workspace is where you configure modules before adding them to the quote."
          actions={emptyStateAction}
          iconSize="medium"
        />
      ) : (
        <SortableList
          items={workspaceModules}
          onReorder={onReorder}
          className="flex flex-col gap-4"
          renderItem={(instance) => {
            const moduleDef = moduleMap.get(instance.moduleId);
            if (!moduleDef) return null;

            return (
              <SortableModuleCard
                key={instance.id}
                instance={instance}
                module={moduleDef}
                isCollapsed={collapsedModules.has(instance.id)}
                onToggleCollapse={onToggleCollapse}
                onRemove={onRemoveModule}
                onAddToQuote={onAddLineItem}
                addedItems={addedItems}
                renderFieldInput={renderFieldInput}
                gridClassName="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 items-start"
                borderClassName="border-border"
              />
            );
          }}
        />
      )}
    </div>
  );
}
