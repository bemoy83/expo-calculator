'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityCard } from '@/components/shared/EntityCard';
import { Chip } from '@/components/ui/Chip';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { FileText, Trash2 } from 'lucide-react';
import type { ModuleTemplate } from '@/lib/types';

export default function TemplatesPage() {
  const templates = useTemplatesStore((state) => state.templates);
  const deleteTemplate = useTemplatesStore((state) => state.deleteTemplate);
  const modules = useModulesStore((state) => state.modules);
  const router = useRouter();

  // Helper function to get module names from template
  // In chain order, repeats included: a template can use the same module more than once.
  const getModuleNames = (template: ModuleTemplate): string[] =>
    template.moduleInstances.map(
      (instance) => modules.find((m) => m.id === instance.moduleId)?.name || 'Missing module'
    );

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Templates</h1>
          <p className="text-xs text-ink-muted">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'} · read-only, replaced by calculators
          </p>
        </div>
      </div>

      <div className="mb-4">
        <AlertBanner
          variant="info"
          title="Templates are now calculators"
          messages="Each template is on the Calculators page, with its linked fields as single inputs and a part per module. Open one there, and use Edit to make it a calculator of your own. Templates can't be changed here any more; quotes can still start from them until quotes move to calculators."
          isVisible
        />
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Build calculators on the Calculators page instead."
          iconSize="small"
        />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              moduleNames={getModuleNames(template)}
              onOpen={() => router.push(`/calculator?id=${encodeURIComponent(`template-${template.id}`)}`)}
              onDelete={() => deleteTemplate(template.id)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

interface TemplateCardProps {
  template: ModuleTemplate;
  moduleNames: string[];
  onOpen: () => void;
  onDelete: () => void;
}

// A template, read-only: opening it shows it as a calculator.
function TemplateCard({ template, moduleNames, onOpen, onDelete }: TemplateCardProps) {
  const visibleModules = moduleNames.slice(0, 8);
  const remainingCount = moduleNames.length - visibleModules.length;
  const linkCount = template.moduleInstances.reduce(
    (sum, instance) => sum + Object.keys(instance.fieldLinks ?? {}).length,
    0
  );

  return (
    <EntityCard
      title={template.name}
      description={template.description}
      categories={template.categories}
      onClick={onOpen}
      actions={[
        {
          icon: Trash2,
          actionType: 'delete',
          onAction: onDelete,
          ariaLabel: `Delete ${template.name}`,
          confirmation: {
            title: `Delete "${template.name}"?`,
            message: 'Quotes already started from it are not affected. Its calculator goes too, unless you saved it as one of your own.',
          },
        },
      ]}
      sections={[
        {
          label: 'Modules, in order',
          content: (
            <ol className="flex flex-wrap items-center gap-1.5">
              {visibleModules.map((name, index) => (
                <li key={`${name}-${index}`}>
                  <Chip size="sm" variant="primaryTonal">
                    {name}
                  </Chip>
                </li>
              ))}
              {remainingCount > 0 && (
                <li>
                  <Chip size="sm" variant="outline">
                    +{remainingCount} more
                  </Chip>
                </li>
              )}
            </ol>
          ),
          spacing: 'small',
        },
      ]}
      footer={
        <p className="text-xs text-ink-muted">
          <span className="font-numeric">{template.moduleInstances.length}</span>{' '}
          {template.moduleInstances.length === 1 ? 'module' : 'modules'} ·{' '}
          <span className="font-numeric">{linkCount}</span> {linkCount === 1 ? 'link' : 'links'}
        </p>
      }
    />
  );
}
