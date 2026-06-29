'use client';

import { useCallback, useEffect, useState } from 'react';
import { ModuleFieldInput } from '@/components/shared/ModuleFieldInput';
import { useQuoteFieldLinking } from '@/hooks/use-quote-field-linking';
import { roundMoney } from '@/lib/calculations/money';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import type {
  CalculationModule,
  Field,
  Labor,
  Material,
  ModuleTemplate,
  Quote,
  QuoteModuleInstance,
} from '@/lib/types';

type QuoteFormData = {
  name: string;
  taxRate: number;
  markupPercent: number;
};

interface UseQuoteBuilderStateOptions {
  currentQuote: Quote | null;
  modules: CalculationModule[];
  materials: Material[];
  labor: Labor[];
  templates: ModuleTemplate[];
  updateCurrentQuote: (updates: Partial<Quote>) => void;
  addWorkspaceModule: (moduleId: string) => void;
  removeWorkspaceModule: (instanceId: string) => void;
  updateWorkspaceModuleFieldValue: (
    instanceId: string,
    fieldName: string,
    value: string | number | boolean
  ) => void;
  reorderWorkspaceModules: (newOrder: QuoteModuleInstance[]) => void;
  linkField: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
  unlinkField: (instanceId: string, fieldName: string) => void;
  canLinkFields: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
  addLineItem: (instanceId: string) => boolean;
  removeLineItem: (lineItemId: string) => void;
  setTaxRate: (rate: number) => void;
  setMarkupPercent: (percent: number) => void;
  saveQuote: () => void;
  createTemplateFromWorkspace: (name: string, description?: string) => ModuleTemplate | null;
  applyTemplate: (templateId: string) => { success: boolean; warnings: string[]; appliedModules: number };
}

export function useQuoteBuilderState({
  currentQuote,
  modules,
  materials,
  labor,
  templates,
  updateCurrentQuote,
  addWorkspaceModule,
  removeWorkspaceModule,
  updateWorkspaceModuleFieldValue,
  reorderWorkspaceModules,
  linkField,
  unlinkField,
  canLinkFields,
  addLineItem,
  removeLineItem,
  setTaxRate,
  setMarkupPercent,
  saveQuote,
  createTemplateFromWorkspace,
  applyTemplate,
}: UseQuoteBuilderStateOptions) {
  const [formData, setFormData] = useState<QuoteFormData>({
    name: 'New Quote',
    taxRate: 0,
    markupPercent: 0,
  });
  const [errors] = useState<Record<string, string>>({});
  const [showAddModule, setShowAddModule] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templateWarnings, setTemplateWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (currentQuote) {
      setFormData({
        name: currentQuote.name,
        taxRate: currentQuote.taxRate * 100,
        markupPercent: currentQuote.markupPercent,
      });
    }
  }, [currentQuote]);

  const handleFormDataChange = (updates: Partial<QuoteFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));

    if (currentQuote) {
      if (updates.name !== undefined) {
        updateCurrentQuote({ name: updates.name });
      }
      if (updates.taxRate !== undefined) {
        setTaxRate(updates.taxRate / 100);
      }
      if (updates.markupPercent !== undefined) {
        setMarkupPercent(updates.markupPercent);
      }
    }
  };

  const handleAddModule = (moduleId: string) => {
    addWorkspaceModule(moduleId);
  };

  const closeSaveTemplateModal = () => {
    setShowSaveTemplateModal(false);
    setTemplateName('');
    setTemplateDescription('');
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    const result = createTemplateFromWorkspace(templateName.trim(), templateDescription.trim() || undefined);
    if (result) {
      setTemplateSaveSuccess(result.name);
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setTimeout(() => setTemplateSaveSuccess(null), 3000);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    setTemplateWarnings([]);
    const result = applyTemplate(templateId);

    if (result.warnings.length > 0) {
      setTemplateWarnings(result.warnings);
      setTimeout(() => setTemplateWarnings([]), 5000);
    }

    setShowAddModule(false);
  };

  const usedCategories = Array.from(new Set([
    ...modules.map((m) => m.category).filter(Boolean) as string[],
    ...templates.flatMap((t) => t.categories),
  ]));
  const allCategories = usedCategories.sort();

  const filteredModules = selectedCategory === null
    ? modules
    : modules.filter((m) => m.category === selectedCategory);

  const filteredTemplates = selectedCategory === null
    ? templates
    : templates.filter((t) => t.categories.includes(selectedCategory));

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

  const toggleLinkUI = useCallback((instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || {}),
        [fieldName]: !prev[instanceId]?.[fieldName],
      },
    }));
  }, []);

  const isLinkUIOpen = useCallback(
    (instanceId: string, fieldName: string): boolean => {
      return !!(linkUIOpen[instanceId]?.[fieldName]);
    },
    [linkUIOpen]
  );

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

  const handleLinkChange = useCallback(
    (instance: QuoteModuleInstance, fieldName: string, value: string) => {
      if (value === 'none') {
        unlinkField(instance.id, fieldName);
        closeLinkUI(instance.id, fieldName);
        return;
      }

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

  const handleUnlink = useCallback(
    (instanceId: string, fieldName: string) => {
      unlinkField(instanceId, fieldName);
      closeLinkUI(instanceId, fieldName);
    },
    [closeLinkUI, unlinkField]
  );

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
          labor={labor}
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
      labor,
      toggleLinkUI,
      updateWorkspaceModuleFieldValue,
    ]
  );

  const handleAddLineItem = (id: string) => {
    const wasAdded = addLineItem(id);
    if (!wasAdded) return;
    setAddedItems(new Set([...addedItems, id]));
    setTimeout(() => {
      setAddedItems(new Set());
    }, 2000);
  };

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
          cost: roundMoney(item.cost),
        })),
        subtotal: roundMoney(currentQuote.subtotal),
        markupPercent: roundMoney(currentQuote.markupPercent || 0),
        markupAmount: roundMoney(currentQuote.markupAmount || 0),
        taxRate: roundMoney(currentQuote.taxRate * 100),
        taxAmount: roundMoney(currentQuote.taxAmount),
        total: roundMoney(currentQuote.total),
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

    const formatCurrency = useCurrencyStore.getState().formatCurrency;
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
          <td class="right-align">${formatCurrency(item.cost)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right-align"><strong>Subtotal:</strong></td>
              <td class="right-align">${formatCurrency(currentQuote.subtotal)}</td>
            </tr>
    `;

    if (currentQuote.markupPercent > 0) {
      html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Markup (${currentQuote.markupPercent.toFixed(2)}%):</strong></td>
              <td class="right-align">${formatCurrency(currentQuote.markupAmount || 0)}</td>
            </tr>
      `;
    }

    html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Tax (${(currentQuote.taxRate * 100).toFixed(2)}%):</strong></td>
              <td class="right-align">${formatCurrency(currentQuote.taxAmount)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" class="right-align"><strong>Total:</strong></td>
              <td class="right-align"><strong>${formatCurrency(currentQuote.total)}</strong></td>
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

  return {
    formData,
    errors,
    showAddModule,
    addedItems,
    collapsedModules,
    showSaveTemplateModal,
    templateName,
    templateDescription,
    templateSaveSuccess,
    selectedCategory,
    templateWarnings,
    allCategories,
    filteredModules,
    filteredTemplates,
    renderFieldInput,
    setShowAddModule,
    setSelectedCategory,
    setTemplateName,
    setTemplateDescription,
    setTemplateSaveSuccess,
    setTemplateWarnings,
    handleFormDataChange,
    handleAddModule,
    handleApplyTemplate,
    handleReorder,
    toggleModuleCollapse,
    handleAddLineItem,
    removeWorkspaceModule,
    removeLineItem,
    setMarkupPercent,
    setTaxRate,
    openSaveTemplateModal: () => setShowSaveTemplateModal(true),
    closeSaveTemplateModal,
    handleSaveTemplate,
    handleExport,
    handleExportPDF,
    saveQuote,
  };
}

export type QuoteBuilderState = ReturnType<typeof useQuoteBuilderState>;
