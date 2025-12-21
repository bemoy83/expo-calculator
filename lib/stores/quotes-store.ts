import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quote, QuoteModuleInstance, QuoteLineItem } from '../types';
import { generateId } from '../utils';
import { evaluateFormula } from '../formula-evaluator';
import { useModulesStore } from './modules-store';
import { useMaterialsStore } from './materials-store';

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
  // Line item management (committed items, included in totals)
  addLineItem: (instanceId: string) => void;
  removeLineItem: (lineItemId: string) => void;
  recalculateQuote: () => void;
  setTaxRate: (rate: number) => void;
  setMarkupPercent: (percent: number) => void;
  saveQuote: () => void;
  deleteQuote: (id: string) => void;
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
          taxRate: 0.1, // Default 10%
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
        const module = useModulesStore.getState().getModule(moduleId);
        if (!module) return;
        
        const current = get().currentQuote;
        if (!current) {
          get().createQuote('New Quote');
          return get().addWorkspaceModule(moduleId);
        }
        
        // Initialize field values with defaults
        const fieldValues: Record<string, string | number | boolean> = {};
        for (const field of module.fields) {
          if (field.defaultValue !== undefined) {
            fieldValues[field.variableName] = field.defaultValue;
          } else {
            switch (field.type) {
              case 'number':
                fieldValues[field.variableName] = 0;
                break;
              case 'boolean':
                fieldValues[field.variableName] = false;
                break;
              default:
                fieldValues[field.variableName] = '';
            }
          }
        }
        
        const instance: QuoteModuleInstance = {
          id: generateId(),
          moduleId,
          fieldValues,
          calculatedCost: 0,
        };
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: [...current.workspaceModules, instance],
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
      },
      
      removeWorkspaceModule: (instanceId) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: current.workspaceModules.filter((m) => m.id !== instanceId),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
      },
      
      updateWorkspaceModuleFieldValue: (instanceId, fieldName, value) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: current.workspaceModules.map((module) =>
              module.id === instanceId
                ? {
                    ...module,
                    fieldValues: {
                      ...module.fieldValues,
                      [fieldName]: value,
                    },
                  }
                : module
            ),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
      },
      
      // Line item management - these are committed items included in totals
      addLineItem: (instanceId) => {
        const current = get().currentQuote;
        if (!current) return;
        
        const instance = current.workspaceModules.find((m) => m.id === instanceId);
        if (!instance) return;
        
        const module = useModulesStore.getState().getModule(instance.moduleId);
        if (!module) return;
        
        const materials = useMaterialsStore.getState().materials;
        let cost = 0;
        try {
          cost = evaluateFormula(module.formula, {
            fieldValues: instance.fieldValues,
            materials,
          });
        } catch (error: any) {
          // If formula evaluation fails, show error and don't add line item
          console.error(`Error evaluating formula for module "${module.name}":`, error.message);
          alert(`Cannot add item: ${error.message || 'Formula evaluation failed'}`);
          return;
        }
        
        // Create a brief summary of key field values
        const fieldSummary = module.fields
          .slice(0, 3) // Show first 3 fields
          .map((field) => {
            const value = instance.fieldValues[field.variableName];
            return `${field.label}: ${value}`;
          })
          .join(', ');
        
        const lineItem: QuoteLineItem = {
          id: generateId(),
          moduleId: instance.moduleId,
          moduleName: module.name,
          fieldValues: { ...instance.fieldValues }, // Snapshot of values
          fieldSummary: fieldSummary || 'No details',
          cost,
          createdAt: new Date().toISOString(),
        };
        
        set({
          currentQuote: {
            ...current,
            lineItems: [...current.lineItems, lineItem],
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateQuote();
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
      
      // Recalculate workspace modules (for display only, not totals)
      recalculateWorkspaceModules: () => {
        const current = get().currentQuote;
        if (!current) return;
        
        const materials = useMaterialsStore.getState().materials;
        
        const updatedModules = current.workspaceModules.map((moduleInstance) => {
          const module = useModulesStore.getState().getModule(moduleInstance.moduleId);
          if (!module) return moduleInstance;
          
          let cost = 0;
          try {
            cost = evaluateFormula(module.formula, {
              fieldValues: moduleInstance.fieldValues,
              materials,
            });
          } catch (error: any) {
            // If formula evaluation fails, log error and set cost to 0
            console.error(`Error evaluating formula for module "${module.name}":`, error.message);
            cost = 0;
          }
          
          return {
            ...moduleInstance,
            calculatedCost: cost,
          };
        });
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: updatedModules,
            updatedAt: new Date().toISOString(),
          },
        });
      },
  
      // Recalculate quote totals based ONLY on line items
      // Calculation order: Subtotal → Markup → Tax (on subtotal + markup) → Total
      recalculateQuote: () => {
        const current = get().currentQuote;
        if (!current) return;
        
        // Calculate subtotal from line items only
        const subtotal = current.lineItems.reduce((sum, item) => sum + item.cost, 0);
        
        // Calculate markup amount (markup applies before tax)
        const markupPercent = current.markupPercent || 0;
        const markupAmount = subtotal * (markupPercent / 100);
        
        // Tax applies to subtotal + markup
        const taxBase = subtotal + markupAmount;
        const taxAmount = taxBase * current.taxRate;
        
        // Total = subtotal + markup + tax
        const total = subtotal + markupAmount + taxAmount;
        
        set({
          currentQuote: {
            ...current,
            subtotal,
            markupAmount,
            taxAmount,
            total,
            updatedAt: new Date().toISOString(),
          },
        });
      },
  
      setTaxRate: (rate) => {
        get().updateCurrentQuote({ taxRate: rate });
      },
      
      setMarkupPercent: (percent) => {
        // Clamp markup to 0 or higher (prevent negative markup)
        const clampedPercent = Math.max(0, percent || 0);
        get().updateCurrentQuote({ markupPercent: clampedPercent });
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
    }),
    {
      name: 'quotes-store',
    }
  )
);

