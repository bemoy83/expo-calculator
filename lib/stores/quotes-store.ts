import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quote, QuoteModuleInstance, Field, ModuleTemplate } from '../types';
import { generateId } from '../utils';
import { calculateQuoteTotals, roundMoney, roundRate } from '../calculations/money';
import { buildQuoteLineItem } from '../quotes/line-item-builder';
import { applyTemplateToQuoteWorkspace } from '../quotes/template-application';
import { createTemplateDataFromQuote } from '../quotes/template-helpers';
import {
  addQuoteWorkspaceModule,
  linkQuoteWorkspaceField,
  recalculateQuoteWorkspace,
  removeQuoteWorkspaceModule,
  reorderQuoteWorkspaceModules,
  unlinkQuoteWorkspaceField,
  updateQuoteWorkspaceFieldValue,
  validateQuoteWorkspaceFieldLink,
} from '../quotes/workspace-actions';
import {
  areTypesCompatible,
  detectCircularReference,
  removeBrokenFieldLinks,
  resolveFieldLinksWithMetadata,
} from '../utils/field-linking';
import { useModulesStore } from './modules-store';
import { useMaterialsStore } from './materials-store';
import { useTemplatesStore } from './templates-store';
import { useFunctionsStore } from './functions-store';
import { useLaborStore } from './labor-store';

function getQuoteWorkspaceContext() {
  return {
    modules: useModulesStore.getState().modules,
    materials: useMaterialsStore.getState().materials,
    labor: useLaborStore.getState().labor,
    functions: useFunctionsStore.getState().functions,
  };
}

/**
 * Quotes Store
 * 
 * State Separation:
 * - workspaceModules: Editable module configurations in the workspace.
 *   These are NOT included in quote totals. Users can configure them
 *   and click "Add to Quote" to create line items.
 * 
 * - lineItems: Committed quote items added via "Add to Quote".
 *   These ARE included in totals. They represent snapshots of module
 *   configurations at the time they were added.
 * 
 * Totals are calculated ONLY from lineItems, never from workspaceModules.
 */
interface QuotesStore {
  quotes: Quote[];
  currentQuote: Quote | null;
  createQuote: (name: string) => void;
  updateCurrentQuote: (updates: Partial<Quote>) => void;
  // Workspace module management (editable, not in totals)
  addWorkspaceModule: (moduleId: string) => void;
  removeWorkspaceModule: (instanceId: string) => void;
  updateWorkspaceModuleFieldValue: (instanceId: string, fieldName: string, value: string | number | boolean) => void;
  reorderWorkspaceModules: (newOrder: QuoteModuleInstance[]) => void;
  recalculateWorkspaceModules: () => void;
  // Link management
  linkField: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => { valid: boolean; error?: string };
  unlinkField: (instanceId: string, fieldName: string) => void;
  canLinkFields: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => { valid: boolean; error?: string };
  areTypesCompatible: (sourceField: Field, targetField: Field) => boolean;
  detectCircularReference: (instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => string | null;
  resolveFieldLinks: (instances: QuoteModuleInstance[]) => Record<string, Record<string, any>>;
  // Line item management (committed items, included in totals)
  addLineItem: (instanceId: string) => boolean;
  removeLineItem: (lineItemId: string) => void;
  recalculateQuote: () => void;
  setTaxRate: (rate: number) => void;
  setMarkupPercent: (percent: number) => void;
  saveQuote: () => void;
  deleteQuote: (id: string) => void;
  // Template management
  createTemplateFromWorkspace: (name: string, description?: string) => ModuleTemplate | null;
  applyTemplate: (templateId: string) => { success: boolean; warnings: string[]; appliedModules: number };
}

export const useQuotesStore = create<QuotesStore>()(
  persist(
    (set, get) => ({
      quotes: [],
      currentQuote: null,
      
      createQuote: (name) => {
        const now = new Date().toISOString();
        const newQuote: Quote = {
          id: generateId(),
          name,
          workspaceModules: [], // Editable workspace modules
          lineItems: [], // Committed quote line items
          subtotal: 0,
          markupPercent: 0, // Default 0% markup
          markupAmount: 0,
          taxRate: 0, // Default 0% tax rate
          taxAmount: 0,
          total: 0,
          createdAt: now,
          updatedAt: now,
        };
        set({ currentQuote: newQuote });
      },

      updateCurrentQuote: (updates) => {
        const current = get().currentQuote;
        if (current) {
          set({
            currentQuote: {
              ...current,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          });
          get().recalculateQuote();
        }
      },
  
      // Workspace module management - these are editable and NOT included in totals
      addWorkspaceModule: (moduleId) => {
        const context = getQuoteWorkspaceContext();
        if (!context.modules.some((module) => module.id === moduleId)) return;
        
        const current = get().currentQuote;
        if (!current) {
          get().createQuote('New Quote');
          return get().addWorkspaceModule(moduleId);
        }

        set({
          currentQuote: {
            ...current,
            workspaceModules: addQuoteWorkspaceModule(current.workspaceModules, context, moduleId),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      removeWorkspaceModule: (instanceId) => {
        const current = get().currentQuote;
        if (!current) return;

        set({
          currentQuote: {
            ...current,
            workspaceModules: removeQuoteWorkspaceModule(
              current.workspaceModules,
              getQuoteWorkspaceContext(),
              instanceId
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      reorderWorkspaceModules: (newOrder) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: reorderQuoteWorkspaceModules(newOrder, getQuoteWorkspaceContext()),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      updateWorkspaceModuleFieldValue: (instanceId, fieldName, value) => {
        const current = get().currentQuote;
        if (!current) return;

        set({
          currentQuote: {
            ...current,
            workspaceModules: updateQuoteWorkspaceFieldValue(
              current.workspaceModules,
              getQuoteWorkspaceContext(),
              instanceId,
              fieldName,
              value
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      // Link management
      linkField: (instanceId, fieldName, targetInstanceId, targetFieldName) => {
        const current = get().currentQuote;
        if (!current) return { valid: false, error: 'No quote selected' };
        const result = linkQuoteWorkspaceField(
          current.workspaceModules,
          getQuoteWorkspaceContext(),
          instanceId,
          fieldName,
          targetInstanceId,
          targetFieldName
        );
        if (!result.valid) return result;

        set({
          currentQuote: {
            ...current,
            workspaceModules: result.workspaceModules,
            updatedAt: new Date().toISOString(),
          },
        });

        return { valid: true };
      },
      
      unlinkField: (instanceId, fieldName) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: unlinkQuoteWorkspaceField(
              current.workspaceModules,
              getQuoteWorkspaceContext(),
              instanceId,
              fieldName
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },
      
      canLinkFields: (instanceId, fieldName, targetInstanceId, targetFieldName) => {
        const current = get().currentQuote;
        if (!current) return { valid: false, error: 'No quote selected' };
        return validateQuoteWorkspaceFieldLink(
          current.workspaceModules,
          getQuoteWorkspaceContext(),
          instanceId,
          fieldName,
          targetInstanceId,
          targetFieldName
        );
      },
      
      areTypesCompatible: (sourceField: Field, targetField: Field): boolean => {
        return areTypesCompatible(sourceField, targetField);
      },
      
      detectCircularReference: (instanceId, fieldName, targetInstanceId, targetFieldName): string | null => {
        const current = get().currentQuote;
        if (!current) return null;
        return detectCircularReference(
          current.workspaceModules,
          instanceId,
          fieldName,
          targetInstanceId,
          targetFieldName
        );
      },
      
      // Line item management - these are committed items included in totals
      addLineItem: (instanceId) => {
        const current = get().currentQuote;
        if (!current) return false;
        
        const instance = current.workspaceModules.find((m) => m.id === instanceId);
        if (!instance) return false;
        
        const moduleDef = useModulesStore.getState().getModule(instance.moduleId);
        if (!moduleDef) return false;
        
        const resolvedValues = get().resolveFieldLinks(current.workspaceModules);
        const resolved = resolvedValues[instance.id] || instance.fieldValues;
        
        const materials = useMaterialsStore.getState().materials;
        const functions = useFunctionsStore.getState().functions;
        const labor = useLaborStore.getState().labor;

        const result = buildQuoteLineItem({
          instance,
          moduleDef,
          resolvedFieldValues: resolved,
          materials,
          labor,
          functions,
        });

        if (!result.lineItem) {
          alert(`Cannot add item: ${result.error || 'Calculation failed'}`);
          return false;
        }
        
        set({
          currentQuote: {
            ...current,
            lineItems: [...current.lineItems, result.lineItem],
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateQuote();
        return true;
      },
      
      removeLineItem: (lineItemId) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            lineItems: current.lineItems.filter((item) => item.id !== lineItemId),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateQuote();
      },
      
      resolveFieldLinks: (instances: QuoteModuleInstance[]): Record<string, Record<string, any>> => {
        const resolution = resolveFieldLinksWithMetadata(instances);
        if (resolution.brokenLinks.length > 0) {
          const current = get().currentQuote;
          if (current) {
            set({
              currentQuote: {
                ...current,
                workspaceModules: removeBrokenFieldLinks(current.workspaceModules, resolution.brokenLinks),
                updatedAt: new Date().toISOString(),
              },
            });
          }
        }
        
        return resolution.resolvedValues;
      },
      
      // Recalculate workspace modules (for display only, not totals)
      recalculateWorkspaceModules: () => {
        const current = get().currentQuote;
        if (!current) return;

        set({
          currentQuote: {
            ...current,
            workspaceModules: recalculateQuoteWorkspace(
              current.workspaceModules,
              getQuoteWorkspaceContext()
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },
  
      // Recalculate quote totals based ONLY on line items
      // Calculation order: Subtotal → Markup → Tax (on subtotal + markup) → Total
      recalculateQuote: () => {
        const current = get().currentQuote;
        if (!current) return;

        const totals = calculateQuoteTotals({
          lineItems: current.lineItems,
          markupPercent: current.markupPercent,
          taxRate: current.taxRate,
        });

        set({
          currentQuote: {
            ...current,
            ...totals,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setTaxRate: (rate) => {
        get().updateCurrentQuote({ taxRate: roundRate(rate) });
      },

      setMarkupPercent: (percent) => {
        const clampedPercent = Math.max(0, percent || 0);
        get().updateCurrentQuote({ markupPercent: roundMoney(clampedPercent) });
      },
      
      saveQuote: () => {
        const current = get().currentQuote;
        if (!current) return;

        set((state) => {
          const existingIndex = state.quotes.findIndex((q) => q.id === current.id);
          const updatedQuotes = existingIndex >= 0
            ? state.quotes.map((q, i) => (i === existingIndex ? current : q))
            : [...state.quotes, current];

          return {
            quotes: updatedQuotes,
          };
        });
      },
  
      deleteQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
          currentQuote: state.currentQuote?.id === id ? null : state.currentQuote,
        }));
      },
      
      // Template management
      createTemplateFromWorkspace: (name, description) => {
        const current = get().currentQuote;
        if (!current) return null;

        const template = createTemplateDataFromQuote({
          quote: current,
          getModule: useModulesStore.getState().getModule,
          name,
          description,
        });
        if (!template) return null;

        return useTemplatesStore.getState().addTemplate(template);
      },
      
      applyTemplate: (templateId) => {
        const template = useTemplatesStore.getState().getTemplate(templateId);
        if (!template) {
          return {
            success: false,
            warnings: ['Template not found'],
            appliedModules: 0,
          };
        }
        
        const warnings: string[] = [];
        let appliedModules = 0;
        const current = get().currentQuote;
        if (!current) {
          get().createQuote('New Quote');
        }

        const finalQuote = get().currentQuote;
        if (finalQuote) {
          const result = applyTemplateToQuoteWorkspace({
            template,
            workspaceModules: finalQuote.workspaceModules,
            modules: useModulesStore.getState().modules,
            materials: useMaterialsStore.getState().materials,
            labor: useLaborStore.getState().labor,
            functions: useFunctionsStore.getState().functions,
            getModule: useModulesStore.getState().getModule,
          });
          warnings.push(...result.warnings);
          appliedModules = result.appliedModules;

          set({
            currentQuote: {
              ...finalQuote,
              workspaceModules: result.workspaceModules,
              updatedAt: new Date().toISOString(),
            },
          });
        }

        return {
          success: appliedModules > 0,
          warnings,
          appliedModules,
        };
      },
    }),
    {
      name: 'quotes-store',
    }
  )
);
