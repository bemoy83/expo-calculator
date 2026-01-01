'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SortableModuleCard } from '@/components/SortableModuleCard';
import { SortableList } from '@/components/shared/SortableList';
import { CalculationModule, QuoteModuleInstance, Field } from '@/lib/types';
import { Plus } from 'lucide-react';

interface ModulesManagerProps {
  modules: CalculationModule[];
  workspaceModules: QuoteModuleInstance[];
  collapsedModules: Set<string>;
  onToggleCollapse: (id: string) => void;
  onRemoveModule: (id: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onAddModule: () => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
  onAddLineItem?: (id: string) => void;
  addedItems?: Set<string>;
}

export function ModulesManager({
  modules,
  workspaceModules,
  collapsedModules,
  onToggleCollapse,
  onRemoveModule,
  onReorder,
  onAddModule,
  renderFieldInput,
  onAddLineItem,
  addedItems,
}: ModulesManagerProps) {
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
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Modules</h2>
      </div>

      {workspaceModules.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-sm text-md-on-surface-variant mb-3">
              Add modules to build your template. Each module represents a calculation that can be reused across quotes.
            </p>
            <Button size="sm" onClick={onAddModule} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Module
            </Button>
          </div>
        </Card>
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



