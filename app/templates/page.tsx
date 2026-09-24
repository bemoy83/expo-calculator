'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityCard } from '@/components/shared/EntityCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { notify } from '@/lib/stores/notifications-store';
import { FileText, Plus, Copy, Trash2 } from 'lucide-react';
import type { ModuleTemplate } from '@/lib/types';
import { TemplateEditorView } from './TemplateEditorView';

export default function TemplatesPage() {
  const templates = useTemplatesStore((state) => state.templates);
  const deleteTemplate = useTemplatesStore((state) => state.deleteTemplate);
  const addTemplate = useTemplatesStore((state) => state.addTemplate);
  const getTemplate = useTemplatesStore((state) => state.getTemplate);
  const modules = useModulesStore((state) => state.modules);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // View toggle - single-page pattern (list ↔ editor)
  if (editingTemplateId) {
    return (
      <TemplateEditorView
        templateId={editingTemplateId}
        onClose={() => setEditingTemplateId(null)}
      />
    );
  }

  // Helper function to get module names from template
  // In chain order, repeats included: a template can use the same module more than once.
  const getModuleNames = (template: ModuleTemplate): string[] =>
    template.moduleInstances.map(
      (instance) => modules.find((m) => m.id === instance.moduleId)?.name || 'Missing module'
    );

  // Smart duplication with unique naming
  const handleDuplicate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (!template) return;

    const uniqueName = generateUniqueTemplateName(template.name);
    const { id, createdAt, updatedAt, ...templateData } = template;
    addTemplate({
      ...templateData,
      name: uniqueName,
    });

    notify({ message: `Created "${uniqueName}"`, variant: 'success' });
  };

  const generateUniqueTemplateName = (baseName: string): string => {
    const existingNames = templates.map((t) => t.name.toLowerCase());

    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }

    let candidate = `${baseName} (Copy)`;
    if (!existingNames.includes(candidate.toLowerCase())) {
      return candidate;
    }

    let counter = 2;
    do {
      candidate = `${baseName} (Copy ${counter})`;
      counter++;
    } while (existingNames.includes(candidate.toLowerCase()));

    return candidate;
  };

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Templates</h1>
          <p className="text-xs text-ink-muted">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'} · reusable chains of linked modules, filled in per quote
          </p>
        </div>
        <Button onClick={() => setEditingTemplateId('new')} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="A template is a chain of modules and the links between them, reused with new inputs on each quote. Build one here, or save a Quote Builder workspace as a template."
          iconSize="small"
          actions={
            <Button onClick={() => setEditingTemplateId('new')}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              New template
            </Button>
          }
        />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              moduleNames={getModuleNames(template)}
              onEdit={() => setEditingTemplateId(template.id)}
              onDuplicate={() => handleDuplicate(template.id)}
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
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, moduleNames, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
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
      onClick={onEdit}
      actions={[
        {
          icon: Copy,
          actionType: 'duplicate',
          onAction: onDuplicate,
          ariaLabel: `Duplicate ${template.name}`,
        },
        {
          icon: Trash2,
          actionType: 'delete',
          onAction: onDelete,
          ariaLabel: `Delete ${template.name}`,
          confirmation: {
            title: `Delete "${template.name}"?`,
            message: 'Quotes already started from it are not affected.',
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
