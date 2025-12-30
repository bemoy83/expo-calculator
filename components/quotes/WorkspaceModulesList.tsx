"use client";

import React from "react";
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalculationModule, QuoteModuleInstance } from "@/lib/types";
import { SortableModuleCard } from "@/components/SortableModuleCard";

interface WorkspaceModulesListProps {
  modules: CalculationModule[];
  workspaceModules: QuoteModuleInstance[];
  collapsedModules: Set<string>;
  onToggleCollapse: (id: string) => void;
  onRemoveModule: (id: string) => void;
  onAddLineItem: (id: string) => void;
  addedItems: Set<string>;
  onDragEnd: (event: DragEndEvent) => void;
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
  onDragEnd,
  renderFieldInput,
}: WorkspaceModulesListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (workspaceModules.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={workspaceModules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        {workspaceModules.map((instance) => {
          const moduleDef = modules.find((m) => m.id === instance.moduleId);
          if (!moduleDef) return null;

          return (
            <SortableModuleCard
              key={instance.id}
              instance={instance}
              module={moduleDef}
              isCollapsed={collapsedModules.has(instance.id)}
              onToggleCollapse={onToggleCollapse}
              onRemove={onRemoveModule}
              onAddToQuote={(id) => onAddLineItem(id)}
              addedItems={addedItems}
              renderFieldInput={renderFieldInput}
              gridClassName="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 items-start"
              borderClassName="border-border"
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
