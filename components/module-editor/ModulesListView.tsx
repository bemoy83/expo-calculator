'use client';

import { Calculator, Trash2 } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityCard } from '@/components/shared/EntityCard';
import type { CalculationModule } from '@/lib/types';

interface ModulesListViewProps {
  modules: CalculationModule[];
  /** Opens the module as its calculator. */
  onOpen: (module: CalculationModule) => void;
  onDelete: (id: string) => void;
}

// Modules, read-only: each is shown as a calculator, which is where it's used and edited now.
export function ModulesListView({ modules, onOpen, onDelete }: ModulesListViewProps) {
  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Modules</h1>
          <p className="text-xs text-ink-muted">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'} · read-only, replaced by calculators
          </p>
        </div>
      </div>

      <div className="mb-4">
        <AlertBanner
          variant="info"
          title="Modules are now calculators"
          messages="Each module is on the Calculators page. Open one there, and use Edit to make it a calculator of your own, where it can be split into parts. Modules can't be changed here any more; quotes keep using them until quotes move to calculators."
          isVisible
        />
      </div>

      {modules.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No modules yet"
          description="Build calculators on the Calculators page instead."
          iconSize="small"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((module) => (
            <EntityCard
              key={module.id}
              title={module.name}
              description={module.description}
              category={module.category}
              onClick={() => onOpen(module)}
              actions={[
                {
                  icon: Trash2,
                  actionType: 'delete',
                  onAction: () => onDelete(module.id),
                  ariaLabel: `Delete module: ${module.name}`,
                  confirmation: {
                    title: `Delete "${module.name}"?`,
                    message:
                      'Templates that use it will show it as missing, drafts of it in quotes will no longer show, and its calculator goes too unless you saved it as one of your own. Line items already added to quotes are not affected.',
                  },
                },
              ]}
              sections={[
                {
                  label: 'Fields',
                  content: (
                    <div className="flex flex-wrap gap-1.5">
                      {module.fields.map((field) => (
                        <Chip key={field.id} size="sm" variant="primaryTonal">
                          {field.label}
                        </Chip>
                      ))}
                    </div>
                  ),
                  spacing: 'small',
                },
                ...(module.computedOutputs && module.computedOutputs.length > 0
                  ? [
                      {
                        label: 'Computed Outputs',
                        content: (
                          <div className="flex flex-wrap gap-1.5">
                            {module.computedOutputs.map((output) => (
                              <Chip key={output.id} size="sm" variant="outline">
                                {output.label}
                                {output.unitSymbol && (
                                  <span className="ml-1 font-numeric text-ink-faint">{output.unitSymbol}</span>
                                )}
                              </Chip>
                            ))}
                          </div>
                        ),
                        spacing: 'small' as const,
                      },
                    ]
                  : []),
                {
                  label: 'Formula',
                  content: (
                    <code className="block px-2.5 py-2 rounded-md bg-sunken text-xs leading-relaxed font-numeric text-ink-body whitespace-pre-wrap break-words">
                      {module.formula}
                    </code>
                  ),
                  spacing: 'default',
                },
              ]}
            />
          ))}
        </div>
      )}
    </>
  );
}
