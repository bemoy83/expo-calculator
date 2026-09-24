'use client';

import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { EditorPageHeader } from '@/components/shared/EditorPageHeader';
import { TemplateDetailsCard } from '@/components/template-editor/TemplateDetailsCard';
import { ModuleInstancesManager } from '@/components/template-editor/ModuleInstancesManager';
import { TemplatePreviewSidebar } from '@/components/template-editor/TemplatePreviewSidebar';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useTemplateEditor } from '@/hooks/use-template-editor';

/**
 * TemplateEditorView Component
 *
 * Full-screen editor for creating and editing templates.
 * Uses single-page toggle pattern - no route change.
 */

export interface TemplateEditorViewProps {
  templateId: string; // 'new' or existing template ID
  onClose: () => void;
}

export function TemplateEditorView({ templateId, onClose }: TemplateEditorViewProps) {
  const isNew = templateId === 'new';

  // Stores
  const templates = useTemplatesStore((state) => state.templates);
  const addTemplate = useTemplatesStore((state) => state.addTemplate);
  const updateTemplate = useTemplatesStore((state) => state.updateTemplate);
  const getTemplate = useTemplatesStore((state) => state.getTemplate);
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);

  // Get existing template
  const existingTemplate = isNew ? null : getTemplate(templateId);

  // Form state
  const [formData, setFormData] = useState({
    name: existingTemplate?.name || '',
    description: existingTemplate?.description || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Template editor hook
  const {
    workspaceModules,
    addModuleInstance,
    removeModuleInstance,
    reorderModules,
    linkField,
    unlinkField,
    serializeForSave,
    isFieldLinked,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
  } = useTemplateEditor({
    templateId: templateId === 'new' ? 'new' : templateId,
    template: existingTemplate || null,
    modules,
    materials,
    labor,
  });

  // Save handler
  const handleSave = useCallback(() => {
    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (workspaceModules.length === 0) {
      newErrors.modules = 'At least one module is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Serialize module instances
    const serializedData = serializeForSave();

    const templateData = {
      id: isNew ? crypto.randomUUID() : templateId,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      moduleInstances: serializedData.moduleInstances,
      categories: serializedData.categories, // Use derived categories from modules
    };

    if (isNew) {
      addTemplate(templateData);
    } else {
      updateTemplate(templateId, templateData);
    }

    onClose();
  }, [
    formData,
    workspaceModules,
    isNew,
    templateId,
    serializeForSave,
    addTemplate,
    updateTemplate,
    onClose,
  ]);

  // Module picker handler - keep picker open for rapid multiple additions
  const handleModuleSelected = useCallback(
    (moduleId: string) => {
      addModuleInstance(moduleId);
      // Keep the Add Module section open for rapid multiple additions
      // It will only close when user clicks Cancel
    },
    [addModuleInstance]
  );

  // Form data change handler
  const handleFormDataChange = useCallback(
    (updates: Partial<typeof formData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      // Clear errors for changed fields
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(updates).forEach((key) => {
          delete next[key];
        });
        return next;
      });
    },
    []
  );

  const picker = showModulePicker ? (
    <ModulePickerCard
      show
      title="Add to the template"
      allCategories={Array.from(new Set(modules.map((m) => m.category).filter((cat): cat is string => Boolean(cat))))}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      filteredModules={selectedCategory ? modules.filter((m) => m.category === selectedCategory) : modules}
      modulesCount={modules.length}
      onAddModule={handleModuleSelected}
      onClose={() => setShowModulePicker(false)}
    />
  ) : undefined;

  return (
    <Layout>
      <EditorPageHeader
        section="Templates"
        name={formData.name}
        placeholderName={isNew ? 'New template' : 'Untitled template'}
        submitLabel={isNew ? 'Create template' : 'Save template'}
        onCancel={onClose}
        onSubmit={handleSave}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-5 items-start pb-10">
        <div className="min-w-0 space-y-6">
          <TemplateDetailsCard formData={formData} errors={errors} onFormDataChange={handleFormDataChange} />

          {errors.modules && (
            <p className="px-3 py-2 rounded-md bg-danger-bg text-sm text-danger" role="alert">
              {errors.modules}
            </p>
          )}

          <ModuleInstancesManager
            workspaceModules={workspaceModules}
            modules={modules}
            onRemoveModule={removeModuleInstance}
            onReorder={reorderModules}
            onAddModule={() => setShowModulePicker(true)}
            picker={picker}
            isFieldLinked={isFieldLinked}
            isLinkBroken={isLinkBroken}
            getLinkDisplayName={getLinkDisplayName}
            buildLinkOptions={buildLinkOptions}
            onLinkField={linkField}
            onUnlinkField={unlinkField}
          />
        </div>

        <div className="lg:sticky lg:top-sticky-offset lg:max-h-[calc(100vh-var(--app-header-h)-3rem)] lg:overflow-y-auto lg:pr-1">
          <TemplatePreviewSidebar workspaceModules={workspaceModules} modules={modules} onLinkField={linkField} />
        </div>
      </div>
    </Layout>
  );
}
