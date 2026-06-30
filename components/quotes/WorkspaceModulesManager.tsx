'use client';

import { useMemo } from 'react';
import { SortableList } from '@/components/shared/SortableList';
import { SortableModuleCard } from '@/components/SortableModuleCard';
import type { QuoteModuleInstance, CalculationModule, Field } from '@/lib/types';

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
}: WorkspaceModulesManagerProps) {
  // Stable lookups prevent drag cards from jumping when the list settles.
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
    </div>
  );
}
