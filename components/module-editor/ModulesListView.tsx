'use client';

import { Calculator, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Textarea } from '@/components/ui/Textarea';
import { EntityCard } from '@/components/shared/EntityCard';
import type { CalculationModule } from '@/lib/types';

interface ModulesListViewProps {
  modules: CalculationModule[];
  onCreate: () => void;
  onEdit: (module: CalculationModule) => void;
  onDelete: (id: string) => void;
}

export function ModulesListView({
  modules,
  onCreate,
  onEdit,
  onDelete,
}: ModulesListViewProps) {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Calculation Modules</h1>
          <p className="text-lg text-md-on-surface-variant">Create reusable calculation modules with custom fields and formulas</p>
        </div>
        <Button onClick={onCreate} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-md-surface-variant elevation-4 mb-6" aria-hidden="true">
              <Calculator className="h-12 w-12 text-md-on-surface-variant" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">No Modules Yet</h3>
            <p className="text-base text-md-on-surface-variant mb-8 max-w-md mx-auto leading-relaxed">Create your first calculation module to get started building professional estimates.</p>
            <Button onClick={onCreate} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <EntityCard
              key={module.id}
              title={module.name}
              description={module.description}
              category={module.category}
              onClick={() => onEdit(module)}
              actions={[
                {
                  icon: Trash2,
                  actionType: 'delete',
                  onAction: () => onDelete(module.id),
                  ariaLabel: `Delete module: ${module.name}`,
                  confirmationMessage: `Are you sure you want to delete "${module.name}"?`,
                },
              ]}
              sections={[
                {
                  label: 'Fields',
                  content: (
                    <div className="flex flex-wrap gap-2">
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
                          <div className="flex flex-wrap gap-2">
                            {module.computedOutputs.map((output) => (
                              <Chip key={output.id} size="sm" variant="outline">
                                {output.label}
                                {output.unitSymbol && (
                                  <span className="ml-1 text-xs opacity-70">({output.unitSymbol})</span>
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
                    <Textarea
                      autoGrow={true}
                      value={module.formula}
                      readOnly
                      className="text-xs text-md-primary font-mono"
                    />
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
