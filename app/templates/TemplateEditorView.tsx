'use client';

import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { EditorActionBar } from '@/components/shared/EditorActionBar';
import { TemplateDetailsCard } from '@/components/template-editor/TemplateDetailsCard';
import { ModuleInstancesManager } from '@/components/template-editor/ModuleInstancesManager';
import { TemplatePreviewSidebar } from '@/components/template-editor/TemplatePreviewSidebar';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useTemplateEditor } from '@/hooks/use-template-editor';
import { Plus } from 'lucide-react';

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
    updateFieldValue,
    reorderModules,
    linkField,
    unlinkField,
    serializeForSave,
    isFieldLinked,
    getResolvedValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getCurrentLinkValue,
  } = useTemplateEditor({
    templateId: templateId === 'new' ? 'new' : templateId,
    template: existingTemplate || null,
    modules,
    materials,
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

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          {isNew ? 'Create Template' : 'Edit Template'}
        </h1>
        <p className="text-lg text-md-on-surface-variant">
          {isNew
            ? 'Build a reusable template with module combinations and field links'
            : 'Update your template configuration'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        {/* Left Column: Template details + module instances */}
        <div className="lg:col-span-2 space-y-6">
          <TemplateDetailsCard
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
          />

          {errors.modules && (
            <Card className="border-destructive bg-destructive/10">
              <p className="text-sm text-destructive">{errors.modules}</p>
            </Card>
          )}

          {/* Module Picker (replaces empty state when visible) */}
          {showModulePicker && (
            <ModulePickerCard
              show={showModulePicker}
              title="Select Module to Add"
              allCategories={Array.from(new Set(modules.map((m) => m.category).filter((cat): cat is string => Boolean(cat))))}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              filteredModules={
                selectedCategory
                  ? modules.filter((m) => m.category === selectedCategory)
                  : modules
              }
              modulesCount={modules.length}
              onAddModule={handleModuleSelected}
              onClose={() => setShowModulePicker(false)}
            />
          )}

          {/* Empty State Card - only show when picker is closed and no modules */}
          {!showModulePicker && workspaceModules.length === 0 && (
            <Card>
              <div className="text-center py-6">
                <p className="text-sm text-md-on-surface-variant mb-3">
                  Add calculation modules to build your template. Each module represents a calculation that can be reused across quotes.
                </p>
                <Button size="sm" onClick={() => setShowModulePicker(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Module
                </Button>
              </div>
            </Card>
          )}

          {/* Add Module Button Card - show when there are modules but picker is closed */}
          {!showModulePicker && workspaceModules.length > 0 && (
            <Card>
              <Button
                onClick={() => setShowModulePicker(true)}
                className="rounded-full w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </Card>
          )}

          {/* Module Instances List - only show when there are modules */}
          {workspaceModules.length > 0 && (
            <ModuleInstancesManager
              workspaceModules={workspaceModules}
              modules={modules}
              materials={materials}
              onRemoveModule={removeModuleInstance}
              onReorder={reorderModules}
              onFieldValueChange={updateFieldValue}
              isFieldLinked={isFieldLinked}
              getResolvedValue={getResolvedValue}
              isLinkBroken={isLinkBroken}
              getLinkDisplayName={getLinkDisplayName}
              buildLinkOptions={buildLinkOptions}
              getCurrentLinkValue={getCurrentLinkValue}
              onLinkField={linkField}
              onUnlinkField={unlinkField}
            />
          )}
        </div>

        {/* Right Column: Template Preview Sidebar */}
        <TemplatePreviewSidebar
          workspaceModules={workspaceModules}
          modules={modules}
          onLinkField={linkField}
        />
      </div>

      <EditorActionBar justifyContent="between">
        {!showModulePicker && (
          <Button onClick={() => setShowModulePicker(true)} className="rounded-full" variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        )}
        {showModulePicker && <div />}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-full">
            {isNew ? 'Create' : 'Update'} Template
          </Button>
        </div>
      </EditorActionBar>
    </Layout>
  );
}
