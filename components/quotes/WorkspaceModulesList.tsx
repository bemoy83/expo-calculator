"use client";

import React, { useMemo } from "react";
import { CalculationModule, QuoteModuleInstance } from "@/lib/types";
import { SortableModuleCard } from "@/components/SortableModuleCard";
import { SortableList } from "@/components/shared/SortableList";

interface WorkspaceModulesListProps {
  modules: CalculationModule[];
  workspaceModules: QuoteModuleInstance[];
  collapsedModules: Set<string>;
  onToggleCollapse: (id: string) => void;
  onRemoveModule: (id: string) => void;
  onAddLineItem?: (id: string) => void;
  addedItems?: Set<string>;
  onReorder: (oldIndex: number, newIndex: number) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: any) => React.ReactNode;
}

export function WorkspaceModulesList({
  modules,
  workspaceModules,
  collapsedModules,
  onToggleCollapse,
  onRemoveModule,
  onAddLineItem,
  addedItems,
  onReorder,
  renderFieldInput,
}: WorkspaceModulesListProps) {
  if (workspaceModules.length === 0) return null;

  // Memoize module lookups to prevent unnecessary re-renders during drag operations
  // This ensures stable references and prevents visual jumps when reordering
  const moduleMap = useMemo(() => {
    const map = new Map<string, CalculationModule>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  return (
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
  );
}
