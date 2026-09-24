'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SortableList } from '@/components/shared/SortableList';
import { SectionBar } from '@/components/module-editor/SectionBar';
import { SortableModuleInstance } from './SortableModuleInstance';
import type { QuoteModuleInstance, CalculationModule } from '@/lib/types';

/**
 * The template's chain of modules, in order, with how each field is filled: entered in each
 * quote, or linked to a field of another module in the template.
 */
export interface ModuleInstancesManagerProps {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  onRemoveModule: (instanceId: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onAddModule: () => void;
  /** The module picker, shown above the list while open. */
  picker?: React.ReactNode;
  // Field linking props from use-template-editor hook
  isFieldLinked?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  isLinkBroken?: (instance: QuoteModuleInstance, fieldName: string) => boolean;
  getLinkDisplayName?: (instance: QuoteModuleInstance, fieldName: string) => string;
  buildLinkOptions?: (instance: QuoteModuleInstance, field: { variableName: string; type: any }) => Array<{ value: string; label: string }>;
  onLinkField?: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => void;
  onUnlinkField?: (instanceId: string, fieldName: string) => void;
}

export function ModuleInstancesManager({
  workspaceModules,
  modules,
  onRemoveModule,
  onReorder,
  onAddModule,
  picker,
  isFieldLinked,
  isLinkBroken,
  getLinkDisplayName,
  buildLinkOptions,
  onLinkField,
  onUnlinkField,
}: ModuleInstancesManagerProps) {
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
    <section aria-labelledby="template-modules-heading" className="space-y-3">
      <SectionBar
        id="template-modules-heading"
        title="Modules"
        count={workspaceModules.length}
        action={
          <Button variant="secondary" size="sm" onClick={onAddModule}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add module
          </Button>
        }
      />

      {picker}

      {workspaceModules.length === 0 ? (
        !picker && (
          <p className="px-4 py-6 rounded-[10px] border border-dashed border-border-strong text-center text-sm text-ink-muted">
            Add the modules this calculator is made of. Later modules can take values from earlier
            ones, so a number typed once feeds the whole chain.
          </p>
        )
      ) : (
        <SortableList
          items={workspaceModules}
          onReorder={onReorder}
          className="flex flex-col gap-3"
          renderItem={(instance) => (
            <SortableModuleInstance
              key={instance.id}
              instance={instance}
              module={modules.find((m) => m.id === instance.moduleId)}
              isExpanded={expandedIds.has(instance.id)}
              onToggleExpanded={handleToggleExpanded}
              onRemove={onRemoveModule}
              workspaceModules={workspaceModules}
              isFieldLinked={isFieldLinked}
              isLinkBroken={isLinkBroken}
              getLinkDisplayName={getLinkDisplayName}
              buildLinkOptions={buildLinkOptions}
              onLinkField={onLinkField}
              onUnlinkField={onUnlinkField}
            />
          )}
        />
      )}
    </section>
  );
}
