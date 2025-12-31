'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { QuoteModuleInstance, FieldType, Field } from '@/lib/types';
import { Plus, Download, Save, Package, Calculator, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Chip } from '@/components/ui/Chip';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { WorkspaceModulesList } from '@/components/quotes/WorkspaceModulesList';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';

export default function QuotesPage() {
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const createQuote = useQuotesStore((state) => state.createQuote);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const addWorkspaceModule = useQuotesStore((state) => state.addWorkspaceModule);
  const removeWorkspaceModule = useQuotesStore((state) => state.removeWorkspaceModule);
  const updateWorkspaceModuleFieldValue = useQuotesStore((state) => state.updateWorkspaceModuleFieldValue);
  const reorderWorkspaceModules = useQuotesStore((state) => state.reorderWorkspaceModules);
  const linkField = useQuotesStore((state) => state.linkField);
  const unlinkField = useQuotesStore((state) => state.unlinkField);
  const canLinkFields = useQuotesStore((state) => state.canLinkFields);
  const addLineItem = useQuotesStore((state) => state.addLineItem);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const saveQuote = useQuotesStore((state) => state.saveQuote);
  const createTemplateFromWorkspace = useQuotesStore((state) => state.createTemplateFromWorkspace);
  const applyTemplate = useQuotesStore((state) => state.applyTemplate);
  const templates = useTemplatesStore((state) => state.templates);

  const [quoteName, setQuoteName] = useState('New Quote');
  const [showAddModule, setShowAddModule] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  // Track which fields have link UI expanded: Map<instanceId, Map<fieldName, boolean>>
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});
  // Track which modules are collapsed: Set<instanceId>
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  // Template save modal state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  // Category filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Template application warnings
  const [templateWarnings, setTemplateWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!currentQuote) {
      createQuote('New Quote');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentQuote) {
      setQuoteName(currentQuote.name);
    }
  }, [currentQuote?.id, currentQuote]); // Update when quote ID or quote object changes

  const handleQuoteNameChange = (name: string) => {
    setQuoteName(name);
    if (currentQuote) {
      updateCurrentQuote({ name });
    }
  };

  const handleAddModule = (moduleId: string) => {
    addWorkspaceModule(moduleId);
    // Keep the Add Module section open for rapid multiple additions
    // It will only close when user clicks Cancel
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    
    const result = createTemplateFromWorkspace(templateName.trim(), templateDescription.trim() || undefined);
    if (result) {
      setTemplateSaveSuccess(result.name);
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setTemplateSaveSuccess(null), 3000);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setTemplateWarnings([]);
    const result = applyTemplate(templateId);
    
    if (result.warnings.length > 0) {
      setTemplateWarnings(result.warnings);
      // Auto-dismiss warnings after 5 seconds
      setTimeout(() => setTemplateWarnings([]), 5000);
    }
    
    // Close Add Module section
    setShowAddModule(false);
  };

  // Collect unique categories from modules and templates (only active categories)
  const usedCategories = Array.from(new Set([
    ...modules.map(m => m.category).filter(Boolean) as string[],
    ...templates.flatMap(t => t.categories),
  ]));
  // Only show categories that are actually assigned to modules/templates
  const allCategories = usedCategories.sort();

  // Filter modules and templates by selected category
  const filteredModules = selectedCategory === null 
    ? modules 
    : modules.filter(m => m.category === selectedCategory);
  
  const filteredTemplates = selectedCategory === null
    ? templates
    : templates.filter(t => t.categories.includes(selectedCategory));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && currentQuote) {
      const oldIndex = currentQuote.workspaceModules.findIndex((m) => m.id === active.id);
      const newIndex = currentQuote.workspaceModules.findIndex((m) => m.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(currentQuote.workspaceModules, oldIndex, newIndex);
        reorderWorkspaceModules(reordered);
      }
    }
  };

  // Helper to check if field is linked
  const isFieldLinked = useCallback((instance: QuoteModuleInstance, fieldName: string): boolean => {
    return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
  }, []);

  // Helper to get current link value for dropdown
  const getCurrentLinkValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return 'none';
      return `${link.moduleInstanceId}.${link.fieldVariableName}`;
    },
    []
  );

  // Helper to check if link is broken
  const isLinkBroken = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): boolean => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return false;

      const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
      if (!targetInstance) return true;

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return true;

      const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
      if (!targetField) return true;

      return false;
    },
    [currentQuote?.workspaceModules, modules]
  );

  // Helper to get link display name
  const getLinkDisplayName = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): string => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return '';

      const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
      if (!targetInstance) return 'source unavailable';

      const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
      if (!targetModule) return 'source unavailable';

      const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
      if (!targetField) return 'source unavailable';

      return `${targetModule.name} — ${targetField.label}`;
    },
    [currentQuote?.workspaceModules, modules]
  );

  // Helper to build link options for dropdown
  const buildLinkOptions = useCallback(
    (instance: QuoteModuleInstance, field: { variableName: string; type: FieldType }) => {
      if (!currentQuote) return [{ value: 'none', label: 'None' }];

      const options: Array<{ value: string; label: string }> = [
        { value: 'none', label: 'None' },
      ];

      currentQuote.workspaceModules.forEach((otherInstance) => {
        if (otherInstance.id === instance.id) return;

        const otherModule = modules.find((m) => m.id === otherInstance.moduleId);
        if (!otherModule) return;

        options.push({ value: `sep-${otherInstance.id}`, label: `--- ${otherModule.name} ---` });

        otherModule.fields.forEach((otherField) => {
          if (otherField.type === 'material') return;
          if (otherInstance.id === instance.id && otherField.variableName === field.variableName) return;

          const validation = canLinkFields(instance.id, field.variableName, otherInstance.id, otherField.variableName);
          if (validation.valid) {
            options.push({
              value: `${otherInstance.id}.${otherField.variableName}`,
              label: otherField.label,
            });
          }
        });
      });

      return options;
    },
    [canLinkFields, currentQuote, modules]
  );

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
  const isLinkUIOpen = useCallback(
    (instanceId: string, fieldName: string): boolean => {
      return !!(linkUIOpen[instanceId]?.[fieldName]);
    },
    [linkUIOpen]
  );

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
  const handleLinkChange = useCallback(
    (instance: QuoteModuleInstance, fieldName: string, value: string) => {
      if (value === 'none') {
        unlinkField(instance.id, fieldName);
        closeLinkUI(instance.id, fieldName);
        return;
      }

      const [targetInstanceId, targetFieldName] = value.split('.');
      if (!targetInstanceId || !targetFieldName) return;

      const result = linkField(instance.id, fieldName, targetInstanceId, targetFieldName);
      if (!result.valid && result.error) {
        alert(result.error);
      } else {
        closeLinkUI(instance.id, fieldName);
      }
    },
    [closeLinkUI, linkField, unlinkField]
  );

  // Helper to handle unlink
  const handleUnlink = useCallback(
    (instanceId: string, fieldName: string) => {
      unlinkField(instanceId, fieldName);
      closeLinkUI(instanceId, fieldName);
    },
    [closeLinkUI, unlinkField]
  );

  // Helper to toggle module collapse
  const toggleModuleCollapse = (instanceId: string) => {
    setCollapsedModules((prev) => {
      const updated = new Set(prev);
      if (updated.has(instanceId)) {
        updated.delete(instanceId);
      } else {
        updated.add(instanceId);
      }
      return updated;
    });
  };

  // Helper to check if module is collapsed
  const isModuleCollapsed = (instanceId: string): boolean => {
    return collapsedModules.has(instanceId);
  };

  // Helper to get resolved value for display (when linked)
  const getResolvedValue = useCallback(
    (instance: QuoteModuleInstance, fieldName: string): any => {
      const link = instance.fieldLinks?.[fieldName];
      if (!link) return instance.fieldValues[fieldName];

      const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
      if (!targetInstance) return instance.fieldValues[fieldName];

      return targetInstance.fieldValues[link.fieldVariableName];
    },
    [currentQuote?.workspaceModules]
  );

  const renderFieldInput = useCallback(
    (instance: QuoteModuleInstance, field: Field) => {
      const isLinkedToValue = isFieldLinked(instance, field.variableName);
      const displayValue = isLinkedToValue
        ? getResolvedValue(instance, field.variableName)
        : instance.fieldValues[field.variableName];

      const linkProps =
        field.type !== 'material'
          ? {
              canLink: true,
              isLinked: isLinkedToValue,
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
            updateWorkspaceModuleFieldValue(instance.id, field.variableName, val);
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
      updateWorkspaceModuleFieldValue,
    ]
  );

  const handleExport = () => {
    if (!currentQuote) return;

    const modulesStore = useModulesStore.getState();
    const quoteData = {
      quote: {
        name: currentQuote.name,
        createdAt: currentQuote.createdAt,
        lineItems: currentQuote.lineItems.map((item) => ({
          moduleName: item.moduleName,
          fields: Object.entries(item.fieldValues).map(([key, value]) => {
            const mod = modulesStore.getModule(item.moduleId);
            const field = mod?.fields.find((f) => f.variableName === key);
            return {
              label: field?.label || key,
              value: value,
            };
          }),
          cost: item.cost,
        })),
        subtotal: currentQuote.subtotal,
        markupPercent: currentQuote.markupPercent || 0,
        markupAmount: currentQuote.markupAmount || 0,
        taxRate: currentQuote.taxRate * 100,
        taxAmount: currentQuote.taxAmount,
        total: currentQuote.total,
      },
    };

    const blob = new Blob([JSON.stringify(quoteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentQuote.name.replace(/\s+/g, '_')}_quote.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!currentQuote) return;

    const modulesStore = useModulesStore.getState();
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote: ${currentQuote.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .right-align { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${currentQuote.name}</h1>
        <p><strong>Date:</strong> ${new Date(currentQuote.createdAt).toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Details</th>
              <th class="right-align">Cost</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentQuote.lineItems.forEach((item) => {
      html += `
        <tr>
          <td>${item.moduleName}</td>
          <td>${item.fieldSummary}</td>
          <td class="right-align">$${item.cost.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right-align"><strong>Subtotal:</strong></td>
              <td class="right-align">$${currentQuote.subtotal.toFixed(2)}</td>
            </tr>
    `;
    
    if (currentQuote.markupPercent > 0) {
      html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Markup (${currentQuote.markupPercent.toFixed(1)}%):</strong></td>
              <td class="right-align">$${(currentQuote.markupAmount || 0).toFixed(2)}</td>
            </tr>
      `;
    }
    
    html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Tax (${(currentQuote.taxRate * 100).toFixed(1)}%):</strong></td>
              <td class="right-align">$${currentQuote.taxAmount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" class="right-align"><strong>Total:</strong></td>
              <td class="right-align"><strong>$${currentQuote.total.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!currentQuote) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Calculator className="h-8 w-8 text-md-on-surface-variant animate-pulse" />
            </div>
            <p className="text-md-on-surface-variant">Loading quote builder...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Quote Builder</h1>
          <p className="text-lg text-md-on-surface-variant">Build comprehensive construction cost estimates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => saveQuote()} className="rounded-full">
            <Save className="h-4 w-4 mr-2" />
            Save Quote
          </Button>
          <Button variant="secondary" onClick={handleExport} className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Print/PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          {/* Quote Name Card */}
          <Card>
            <Input
              label="Quote Name"
              value={quoteName}
              onChange={(e) => handleQuoteNameChange(e.target.value)}
            />
          </Card>

          {/* Template Warnings */}
          {templateWarnings.length > 0 && (
            <Card className="border-warning bg-warning/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning mb-2">
                    Template applied with {templateWarnings.length} warning(s):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-warning">
                    {templateWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setTemplateWarnings([])}
                  className="text-warning hover:text-warning/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          {/* Add Module Card */}
          {showAddModule && (
            <ModulePickerCard
              show={showAddModule}
              allCategories={allCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              filteredModules={filteredModules}
              filteredTemplates={filteredTemplates}
              modulesCount={modules.length}
              templatesCount={templates.length}
              onAddModule={handleAddModule}
              onApplyTemplate={handleApplyTemplate}
              onClose={() => setShowAddModule(false)}
            />
          )}

          {/* Empty State Card */}
          {!showAddModule && currentQuote.workspaceModules.length === 0 && (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted elevation-1 mb-5">
                  <Package className="h-10 w-10 text-md-on-surface-variant" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2 tracking-tight">No modules in workspace</h4>
                <p className="text-base text-md-on-surface-variant max-w-md mx-auto leading-relaxed mb-5">
                  Click &quot;Add Module&quot; to get started, then configure and add them to your quote.
                </p>
                <Button 
                  onClick={() => setShowAddModule(true)}
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </Card>
          )}

          {/* Add Module Button Card */}
          {!showAddModule && currentQuote.workspaceModules.length > 0 && (
            <Card>
              <Button 
                onClick={() => setShowAddModule(true)}
                className="rounded-full w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </Card>
          )}

          {/* Module Cards */}
          {currentQuote.workspaceModules.length > 0 && (
            <WorkspaceModulesList
              modules={modules}
              workspaceModules={currentQuote.workspaceModules}
              collapsedModules={collapsedModules}
              onToggleCollapse={toggleModuleCollapse}
              onRemoveModule={removeWorkspaceModule}
              onAddLineItem={(id) => {
                addLineItem(id);
                setAddedItems(new Set([...addedItems, id]));
                setTimeout(() => {
                  setAddedItems(new Set());
                }, 2000);
              }}
              addedItems={addedItems}
              onDragEnd={handleDragEnd}
              renderFieldInput={renderFieldInput}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <QuoteSummaryCard
            quote={currentQuote}
            setMarkupPercent={setMarkupPercent}
            setTaxRate={setTaxRate}
            removeLineItem={removeLineItem}
          />
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-md-primary">Save as Template</h3>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="text-md-on-surface-variant hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Wall + Finish Setup"
                required
              />
              
              <Textarea
                label="Description (optional)"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is used for..."
                rows={3}
              />
              
              <div className="p-3 bg-muted/50 border border-border rounded-md">
                <p className="text-xs font-medium text-md-on-surface mb-2">This template will save:</p>
                <ul className="space-y-1 text-xs text-md-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                    Module combinations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                    Field linking relationships
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-3 w-3 text-destructive shrink-0" />
                    Field values (you&apos;ll enter these when using the template)
                  </li>
                </ul>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                    setTemplateDescription('');
                  }}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="rounded-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Template Save Success Message */}
      {templateSaveSuccess && (
        <div className="fixed bottom-24 right-4 z-50">
          <Card className="bg-success/10 border-success/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success">
                Template &apos;{templateSaveSuccess}&apos; saved successfully
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div data-bottom-action-bar className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-3">
          <Button 
            onClick={() => setShowSaveTemplateModal(true)}
            className="rounded-full"
            disabled={!currentQuote || currentQuote.workspaceModules.length === 0}
            variant="secondary"
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
          <Button 
            onClick={() => setShowAddModule(true)}
            className="rounded-full"
            disabled={showAddModule}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>
    </Layout>
  );
}
