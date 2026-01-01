'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { QuoteModuleInstance, Field } from '@/lib/types';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { useTemplateEditor } from '@/hooks/use-template-editor';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { ModulesManager } from '@/components/module-editor/ModulesManager';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
interface TemplateEditorClientProps {
  templateId: string;
}

export function TemplateEditorClient({ templateId }: TemplateEditorClientProps) {
  // ⚠️ ALL HOOKS MUST BE CALLED UNCONDITIONALLY ⚠️
  // Call all hooks before any conditional returns to ensure hooks order stability
  const router = useRouter();
  
  // ⭐ Prevent hydration mismatch
  const [hydrated, setHydrated] = useState(false);

  // Use object selector to get all template store functions (single subscription)
  const { getTemplate, updateTemplate, addTemplate } = useTemplatesStore((state) => ({
    getTemplate: state.getTemplate,
    updateTemplate: state.updateTemplate,
    addTemplate: state.addTemplate,
  }));
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Derive template after hooks are called unconditionally
  const template = templateId === 'new' ? null : getTemplate(templateId);

  const {
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    workspaceModules,
    addModuleInstance,
    removeModuleInstance,
    reorderModules,
    updateFieldValue,
    isFieldLinked,
    getResolvedValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getCurrentLinkValue,
    linkField: linkFieldFromHook,
    unlinkField,
    serializeForSave,
  } = useTemplateEditor({
    templateId,
    template: template || null,
    modules,
    materials,
  });

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [showAddModule, setShowAddModule] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Track which fields have link UI expanded: Map<instanceId, Map<fieldName, boolean>>
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});
  // Success toast state
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleAddModule = useCallback((moduleId: string) => {
    addModuleInstance(moduleId);
  }, [addModuleInstance]);

  const handleRemoveModule = useCallback((instanceId: string) => {
    removeModuleInstance(instanceId);
  }, [removeModuleInstance]);

  // Toggle collapse
  const toggleModuleCollapse = useCallback((instanceId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  }, []);

  const handleReorder = (oldIndex: number, newIndex: number) => {
    reorderModules(oldIndex, newIndex);
  };

  // Helper functions for link UI
  // Helper to toggle link UI expansion
  const toggleLinkUI = useCallback((instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || {}),
        [fieldName]: !prev[instanceId]?.[fieldName],
      },
    }));
  }, []);

  // Helper to check if link UI is open
  const isLinkUIOpen = useCallback((instanceId: string, fieldName: string): boolean => {
    return !!(linkUIOpen[instanceId]?.[fieldName]);
  }, [linkUIOpen]);

  // Helper to close link UI
  const closeLinkUI = useCallback((instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => {
      const updated = { ...prev };
      if (updated[instanceId]) {
        const instanceLinks = { ...updated[instanceId] };
        delete instanceLinks[fieldName];
        if (Object.keys(instanceLinks).length === 0) {
          delete updated[instanceId];
        } else {
          updated[instanceId] = instanceLinks;
        }
      }
      return updated;
    });
  }, []);

  // Helper to handle link change
  const handleLinkChange = useCallback((instance: QuoteModuleInstance, fieldName: string, value: string) => {
    if (value === 'none') {
      unlinkField(instance.id, fieldName);
      closeLinkUI(instance.id, fieldName);
      return;
    }
    
    const [targetInstanceId, targetFieldName] = value.split('.');
    if (!targetInstanceId || !targetFieldName) return;
    
    const result = linkFieldFromHook(instance.id, fieldName, targetInstanceId, targetFieldName);
    if (!result.valid && result.error) {
      alert(result.error);
    } else {
      // Collapse UI after successful linking
      closeLinkUI(instance.id, fieldName);
    }
  }, [linkFieldFromHook, unlinkField, closeLinkUI]);

  // Helper to handle unlink
  const handleUnlink = useCallback((instanceId: string, fieldName: string) => {
    unlinkField(instanceId, fieldName);
    closeLinkUI(instanceId, fieldName);
  }, [unlinkField, closeLinkUI]);

  // Save template
  const handleSaveTemplate = () => {
    const payload = serializeForSave();

    // Create new template or update existing
    if (templateId === 'new') {
      addTemplate({
        name: payload.name || 'New Template',
        description: payload.description,
        moduleInstances: payload.moduleInstances,
        categories: payload.categories,
      });
    } else if (template) {
      updateTemplate(templateId, {
        name: payload.name,
        description: payload.description,
        moduleInstances: payload.moduleInstances,
        categories: payload.categories,
      });
    }

    setSaveSuccessMessage(payload.name || 'New Template');
    router.push('/templates');
  };

  // Cancel
  const handleCancel = () => {
    router.push('/templates');
  };

  const renderFieldInput = useCallback(
    (instance: QuoteModuleInstance, field: Field) => {
      const isLinked = isFieldLinked(instance, field.variableName);
      const displayValue = isLinked
        ? getResolvedValue(instance, field.variableName)
        : instance.fieldValues[field.variableName];

      const linkProps =
        field.type !== 'material'
          ? {
              canLink: true,
              isLinked,
              isLinkBroken: isLinkBroken(instance, field.variableName),
              linkDisplayName: getLinkDisplayName(instance, field.variableName),
              linkUIOpen: isLinkUIOpen(instance.id, field.variableName),
              currentLinkValue: getCurrentLinkValue(instance, field.variableName),
              linkOptions: buildLinkOptions(instance, field),
              onToggleLink: () => toggleLinkUI(instance.id, field.variableName),
              onLinkChange: (value: string) => handleLinkChange(instance, field.variableName, value),
              onUnlink: () => handleUnlink(instance.id, field.variableName),
            }
          : undefined;

      return (
        <ModuleFieldInput
          field={field}
          value={displayValue}
          materials={materials}
          onChange={(val) => {
            if (linkProps?.isLinked) return;
            updateFieldValue(instance.id, field.variableName, val);
          }}
          linkProps={linkProps}
        />
      );
    },
    [
      buildLinkOptions,
      getCurrentLinkValue,
      getLinkDisplayName,
      getResolvedValue,
      handleLinkChange,
      handleUnlink,
      isFieldLinked,
      isLinkBroken,
      isLinkUIOpen,
      materials,
      toggleLinkUI,
      updateFieldValue,
    ]
  );

  // ⚠️ ALL HOOKS MUST BE ABOVE THIS LINE ⚠️
  // Early return AFTER all hooks to ensure hooks order stability
  // Prevent hydration mismatch - return null until client mount
  if (!hydrated) return null;

  // Allow 'new' template mode, but redirect if templateId is invalid (not 'new' and template doesn't exist)
  if (templateId !== 'new' && !template) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <AlertCircle className="h-8 w-8 text-md-on-surface-variant" />
            </div>
            <p className="text-md-on-surface-variant">Template not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Collect unique categories from modules
  const usedCategories = Array.from(
    new Set(modules.map(m => m.category).filter(Boolean) as string[])
  ).sort();

  // Filter modules by category
  const filteredModules = modules.filter((module) => {
    if (selectedCategory === null) return true;
    return module.category === selectedCategory;
  });

  // Check for deleted modules (only for existing templates, not new ones)
  const hasDeletedModules = templateId !== 'new' && template
    ? template.moduleInstances.some(
        (instance) => !modules.find((m) => m.id === instance.moduleId)
      )
    : false;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Edit Template</h1>
        <p className="text-lg text-md-on-surface-variant">Configure module combinations and field relationships</p>
      </div>

      {/* Template Name/Description Editor */}
      <Card className="mb-6">
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
          />
          <Textarea
            label="Description (optional)"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Enter template description"
            rows={3}
          />
        </div>
      </Card>

      {/* Warning for deleted modules */}
      {hasDeletedModules && (
        <Card className="mb-6 border-warning bg-warning/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">
                Some modules referenced in this template no longer exist. They will be removed when you save.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-5 pb-24">
        {/* Add Module Card */}
        {showAddModule && (
          <ModulePickerCard
            show={showAddModule}
            title="Select Module to Add"
            allCategories={usedCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            filteredModules={filteredModules}
            modulesCount={modules.length}
            onAddModule={(id) => {
              handleAddModule(id);
              setShowAddModule(false);
            }}
            onClose={() => setShowAddModule(false)}
          />
        )}

        {/* Modules Manager */}
        <ModulesManager
          modules={modules}
          workspaceModules={workspaceModules}
          collapsedModules={collapsedModules}
          onToggleCollapse={toggleModuleCollapse}
          onRemoveModule={handleRemoveModule}
          onReorder={handleReorder}
          onAddModule={() => setShowAddModule(true)}
          renderFieldInput={renderFieldInput}
        />
      </div>

      {/* Save Success Toast */}
      {saveSuccessMessage && (
        <div className="fixed bottom-24 right-4 z-50">
          <Card className="bg-success/10 border-success/30">
            <div className="flex items-center gap-2 p-3">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success">
                Template &apos;{saveSuccessMessage}&apos; saved successfully
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <Button onClick={() => setShowAddModule(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleCancel} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} className="rounded-full">
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
