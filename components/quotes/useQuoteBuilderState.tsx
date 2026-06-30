'use client';

import { useEffect, useState } from 'react';
import { useAddedItemFeedback } from '@/components/quotes/quote-builder/useAddedItemFeedback';
import { useQuoteCatalogFilter } from '@/components/quotes/quote-builder/useQuoteCatalogFilter';
import { useQuoteFieldInputRenderer } from '@/components/quotes/quote-builder/useQuoteFieldInputRenderer';
import { useQuoteTemplateUi } from '@/components/quotes/quote-builder/useQuoteTemplateUi';
import { useQuoteWorkspaceUi } from '@/components/quotes/quote-builder/useQuoteWorkspaceUi';
import {
  buildQuoteExportData,
  buildQuotePrintHtml,
  getQuoteExportFileName,
} from '@/lib/quotes/export';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type {
  CalculationModule,
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

  const catalog = useQuoteCatalogFilter({ modules, templates });
  const workspaceUi = useQuoteWorkspaceUi({
    currentQuote,
    reorderWorkspaceModules,
  });
  const addedItemFeedback = useAddedItemFeedback({ addLineItem });
  const templateUi = useQuoteTemplateUi({
    createTemplateFromWorkspace,
    applyTemplate,
    closeModulePicker: () => setShowAddModule(false),
  });
  const { renderFieldInput } = useQuoteFieldInputRenderer({
    currentQuote,
    modules,
    materials,
    labor,
    canLinkFields,
    linkField,
    unlinkField,
    updateWorkspaceModuleFieldValue,
  });

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

  const handleExport = () => {
    if (!currentQuote) return;

    const quoteData = buildQuoteExportData({
      quote: currentQuote,
      getModule: (id) => modules.find((module) => module.id === id),
    });
    const blob = new Blob([JSON.stringify(quoteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getQuoteExportFileName(currentQuote.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!currentQuote) return;

    const formatCurrency = useCurrencyStore.getState().formatCurrency;
    const html = buildQuotePrintHtml({ quote: currentQuote, formatCurrency });

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
    addedItems: addedItemFeedback.addedItems,
    collapsedModules: workspaceUi.collapsedModules,
    showSaveTemplateModal: templateUi.showSaveTemplateModal,
    templateName: templateUi.templateName,
    templateDescription: templateUi.templateDescription,
    templateSaveSuccess: templateUi.templateSaveSuccess,
    selectedCategory: catalog.selectedCategory,
    templateWarnings: templateUi.templateWarnings,
    allCategories: catalog.allCategories,
    filteredModules: catalog.filteredModules,
    filteredTemplates: catalog.filteredTemplates,
    renderFieldInput,
    setShowAddModule,
    setSelectedCategory: catalog.setSelectedCategory,
    setTemplateName: templateUi.setTemplateName,
    setTemplateDescription: templateUi.setTemplateDescription,
    setTemplateSaveSuccess: templateUi.setTemplateSaveSuccess,
    setTemplateWarnings: templateUi.setTemplateWarnings,
    handleFormDataChange,
    handleAddModule,
    handleApplyTemplate: templateUi.handleApplyTemplate,
    handleReorder: workspaceUi.handleReorder,
    toggleModuleCollapse: workspaceUi.toggleModuleCollapse,
    handleAddLineItem: addedItemFeedback.handleAddLineItem,
    removeWorkspaceModule,
    removeLineItem,
    setMarkupPercent,
    setTaxRate,
    openSaveTemplateModal: templateUi.openSaveTemplateModal,
    closeSaveTemplateModal: templateUi.closeSaveTemplateModal,
    handleSaveTemplate: templateUi.handleSaveTemplate,
    handleExport,
    handleExportPDF,
    saveQuote,
  };
}

export type QuoteBuilderState = ReturnType<typeof useQuoteBuilderState>;
