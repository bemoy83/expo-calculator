'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { NotificationToast } from '@/components/shared/NotificationToast';
import { EntityCard } from '@/components/shared/EntityCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
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
  const [duplicateSuccess, setDuplicateSuccess] = useState<string | null>(null);

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
  const getModuleNames = (template: ModuleTemplate): string[] => {
    return template.moduleInstances
      .map((instance) => {
        const foundModule = modules.find((m) => m.id === instance.moduleId);
        return foundModule?.name || 'Unknown Module';
      })
      .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates
  };

  // Smart duplication with unique naming
  const handleDuplicate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (!template) return;

    const uniqueName = generateUniqueTemplateName(template.name);
    const { id, createdAt, updatedAt, ...templateData } = template;
    const newTemplate = addTemplate({
      ...templateData,
      name: uniqueName,
    });

    setDuplicateSuccess(uniqueName);
    setTimeout(() => setDuplicateSuccess(null), 3000);
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
      <PageHeader
        title="Templates"
        subtitle="Manage reusable module combinations and field links"
        actions={
          <Button onClick={() => setEditingTemplateId('new')} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Templates Yet"
          description="Create templates from your Quote Builder workspace to save module combinations and field links for reuse."
          actions={
            <Button onClick={() => setEditingTemplateId('new')} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <NotificationToast
        message={`Template '${duplicateSuccess}' created successfully`}
        variant="success"
        isVisible={!!duplicateSuccess}
        onDismiss={() => setDuplicateSuccess(null)}
        autoHideDuration={3000}
      />
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
  const visibleModules = moduleNames.slice(0, 6);
  const remainingCount = moduleNames.length - 6;

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
          confirmationMessage: `Delete "${template.name}"?`,
        },
      ]}
      sections={[
        {
          label: 'Modules',
          content: (
            <div className="flex flex-wrap gap-2">
              {visibleModules.map((name) => (
                <Chip key={name} size="sm"
                  variant="primaryTonal">
                  {name}
                </Chip>
              ))}
              {remainingCount > 0 && (
                <Chip size="sm" variant="outline">
                  + {remainingCount} more
                </Chip>
              )}
            </div>
          ),
          spacing: 'small',
        },
      ]}
      footer={
        <p className="text-xs text-md-on-surface-variant">
          {template.moduleInstances.length}{' '}
          {template.moduleInstances.length === 1 ? 'module' : 'modules'}
        </p>
      }
    />
  );
}
