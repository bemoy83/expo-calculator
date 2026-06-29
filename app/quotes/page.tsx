'use client';

import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { QuoteBuilderLoading } from '@/components/quotes/QuoteBuilderLoading';
import { QuoteBuilderWorkspace } from '@/components/quotes/QuoteBuilderWorkspace';
import { useQuoteBuilderState } from '@/components/quotes/useQuoteBuilderState';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useTemplatesStore } from '@/lib/stores/templates-store';

export default function QuotesPage() {
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const templates = useTemplatesStore((state) => state.templates);
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

  useEffect(() => {
    if (!currentQuote) {
      createQuote('New Quote');
    }
  }, [createQuote, currentQuote]);

  const builder = useQuoteBuilderState({
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
  });

  return (
    <Layout>
      {currentQuote ? (
        <QuoteBuilderWorkspace
          quote={currentQuote}
          modules={modules}
          templates={templates}
          builder={builder}
        />
      ) : (
        <QuoteBuilderLoading />
      )}
    </Layout>
  );
}
