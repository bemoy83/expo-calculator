'use client';

import { useMemo } from 'react';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SortableList } from '@/components/shared/SortableList';
import { DraftModuleCard } from '@/components/quotes/DraftModuleCard';
import { getDraftStatus } from '@/lib/quotes/draft-status';
import { getQuoteDraftSummary } from '@/lib/quotes/quote-board';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { resolveFieldLinksWithMetadata } from '@/lib/utils/field-linking';
import type { CalculationModule, Field, Quote, QuoteModuleInstance } from '@/lib/types';

export interface WorkspaceModulesManagerProps {
  quote: Quote;
  modules: CalculationModule[];
  collapsedModules: Set<string>;
  onToggleCollapse: (id: string) => void;
  onRemoveModule: (id: string) => void;
  onDuplicateModule: (id: string) => void;
  onNicknameChange: (id: string, nickname: string) => void;
  onAddLineItem: (id: string) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
  onAddModule: () => void;
  onAddFromTemplate: () => void;
  /** The module picker, shown at the top of the bench while open. */
  picker?: React.ReactNode;
}

// The workspace "bench" (mockup 2a): a sunken, dashed-edged area for drafts, visibly apart
// from the sealed quote. Nothing here counts toward the client total.
export function WorkspaceModulesManager({
  quote,
  modules,
  collapsedModules,
  onToggleCollapse,
  onRemoveModule,
  onDuplicateModule,
  onNicknameChange,
  onAddLineItem,
  onReorder,
  renderFieldInput,
  onAddModule,
  onAddFromTemplate,
  picker,
}: WorkspaceModulesManagerProps) {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const functions = useFunctionsStore((state) => state.functions);
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const workspaceModules = quote.workspaceModules;

  // Stable lookups prevent drag cards from jumping when the list settles.
  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);

  const drafts = useMemo(() => {
    const { resolvedValues } = resolveFieldLinksWithMetadata(workspaceModules);
    const seenPerModule = new Map<string, number>();
    return new Map(
      workspaceModules.flatMap((instance) => {
        const moduleDef = moduleMap.get(instance.moduleId);
        if (!moduleDef) return [];
        const instanceNumber = (seenPerModule.get(instance.moduleId) ?? 0) + 1;
        seenPerModule.set(instance.moduleId, instanceNumber);
        const status = getDraftStatus({
          instance,
          moduleDef,
          resolvedFieldValues: resolvedValues[instance.id] ?? instance.fieldValues,
          materials,
          labor,
          functions,
        });
        return [[instance.id, { instanceNumber, status }] as const];
      })
    );
  }, [workspaceModules, moduleMap, materials, labor, functions]);

  const draftCount = workspaceModules.length;
  const uncounted = getQuoteDraftSummary(quote).cost;

  return (
    <section
      aria-labelledby="workspace-heading"
      className="flex flex-col gap-3 p-3.5 rounded-[10px] bg-sunken border border-dashed border-border-strong"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id="workspace-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Workspace
        </h2>
        {draftCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full bg-draft-bg text-[10.5px] font-medium text-draft"
            title={`${formatCurrency(uncounted)} in drafts`}
          >
            {draftCount} {draftCount === 1 ? 'draft' : 'drafts'} · not in total
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onAddModule}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add module
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddFromTemplate}>
            <Package className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            From template
          </Button>
        </div>
      </div>

      {picker}

      {draftCount === 0 && !picker ? (
        <div className="py-10 text-center">
          <p className="text-sm text-ink-muted mb-3">
            The workspace is empty. Add a module to configure it here before it goes into the quote.
          </p>
          <Button size="sm" onClick={onAddModule}>
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add your first module
          </Button>
        </div>
      ) : (
        <SortableList
          items={workspaceModules}
          onReorder={onReorder}
          className="flex flex-col gap-3"
          renderItem={(instance) => {
            const moduleDef = moduleMap.get(instance.moduleId);
            const draft = drafts.get(instance.id);
            if (!moduleDef || !draft) return null;
            return (
              <DraftModuleCard
                key={instance.id}
                instance={instance}
                module={moduleDef}
                instanceNumber={draft.instanceNumber}
                status={draft.status}
                isCollapsed={collapsedModules.has(instance.id)}
                onToggleCollapse={onToggleCollapse}
                onRemove={onRemoveModule}
                onDuplicate={onDuplicateModule}
                onNicknameChange={onNicknameChange}
                onLockIn={onAddLineItem}
                renderFieldInput={renderFieldInput}
              />
            );
          }}
        />
      )}

      {draftCount > 0 && (
        <p className="pt-1 text-center text-[11.5px] text-ink-faint">
          Drafts stay here until you lock them in — nothing here touches the client total.
        </p>
      )}
    </section>
  );
}
