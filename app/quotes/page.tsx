'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { QuoteModuleInstance, Field } from '@/lib/types';
import { Plus, Download, Save, Calculator, CheckCircle2, X } from 'lucide-react';
// Shared components
import { PageHeader } from '@/components/shared/PageHeader';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { ModalDialog } from '@/components/shared/ModalDialog';
import { NotificationToast } from '@/components/shared/NotificationToast';
import { EditorActionBar } from '@/components/shared/EditorActionBar';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
// Feature components
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { WorkspaceModulesManager } from '@/components/quotes/WorkspaceModulesManager';
import { QuoteDetailsCard } from '@/components/quotes/QuoteDetailsCard';
// Hooks
import { useQuoteFieldLinking } from '@/hooks/use-quote-field-linking';

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

  const [formData, setFormData] = useState({
    name: 'New Quote',
    taxRate: 0,
    markupPercent: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      setFormData({
        name: currentQuote.name,
        taxRate: currentQuote.taxRate * 100, // Convert to percentage
        markupPercent: currentQuote.markupPercent,
      });
    }
  }, [currentQuote]); // Update when quote changes

  const handleFormDataChange = (updates: Partial<{ name: string; taxRate: number; markupPercent: number }>) => {
    setFormData((prev) => ({ ...prev, ...updates }));

    if (currentQuote) {
      // Update quote in store
      if (updates.name !== undefined) {
        updateCurrentQuote({ name: updates.name });
      }
      if (updates.taxRate !== undefined) {
        setTaxRate(updates.taxRate / 100); // Convert from percentage to decimal
      }
      if (updates.markupPercent !== undefined) {
        setMarkupPercent(updates.markupPercent);
      }
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

  const handleReorder = (oldIndex: number, newIndex: number) => {
    if (!currentQuote) return;
    if (oldIndex === newIndex) return;
    const items = currentQuote.workspaceModules;
    if (!items[oldIndex] || !items[newIndex]) return;
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorderWorkspaceModules(reordered);
  };

  // Field linking helpers from hook
  const {
    isFieldLinked,
    getCurrentLinkValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getResolvedValue,
  } = useQuoteFieldLinking({
    currentQuote,
    modules,
    canLinkFields,
  });

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

      // Split only on the first dot to handle computed outputs with 'out.' prefix
      const firstDotIndex = value.indexOf('.');
      if (firstDotIndex === -1) return;
      
      const targetInstanceId = value.substring(0, firstDotIndex);
      const targetFieldName = value.substring(firstDotIndex + 1);
      
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
      <PageHeader
        title="Quote Builder"
        subtitle="Build comprehensive construction cost estimates"
        actions={
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
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          {/* Quote Details Card */}
          <QuoteDetailsCard
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
          />

          {/* Template Warnings */}
          <AlertBanner
            variant="warning"
            title={`Template applied with ${templateWarnings.length} warning(s):`}
            messages={templateWarnings}
            isVisible={templateWarnings.length > 0}
            onDismiss={() => setTemplateWarnings([])}
          />

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

          {/* Empty State Card - only show when picker is closed and no modules */}
          {!showAddModule && currentQuote.workspaceModules.length === 0 && (
            <Card>
              <div className="text-center py-6">
                <p className="text-sm text-md-on-surface-variant mb-3">
                  Add calculation modules to build your quote. Your workspace is where you configure modules before adding them to the quote.
                </p>
                <Button size="sm" onClick={() => setShowAddModule(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Module
                </Button>
              </div>
            </Card>
          )}

          {/* Add Module Button Card - show when there are modules but picker is closed */}
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

          {/* Workspace Modules - only show when there are modules */}
          {currentQuote.workspaceModules.length > 0 && (
            <WorkspaceModulesManager
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
              onReorder={handleReorder}
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
      <ModalDialog
        isOpen={showSaveTemplateModal}
        onClose={() => {
          setShowSaveTemplateModal(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        title="Save as Template"
        maxWidth="medium"
      >
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
      </ModalDialog>

      {/* Template Save Success Message */}
      <NotificationToast
        message={`Template '${templateSaveSuccess}' saved successfully`}
        variant="success"
        isVisible={!!templateSaveSuccess}
        onDismiss={() => setTemplateSaveSuccess(null)}
        autoHideDuration={3000}
      />

      {/* Bottom Action Bar */}
      <EditorActionBar justifyContent="end">
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
      </EditorActionBar>
    </Layout>
  );
}
