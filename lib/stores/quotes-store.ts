import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quote, QuoteModuleInstance, QuoteLineItem, FieldLink, Field, ModuleTemplate } from '../types';
import { generateId } from '../utils';
import { evaluateFormula } from '../formula-evaluator';
import { useModulesStore } from './modules-store';
import { useMaterialsStore } from './materials-store';
import { useTemplatesStore } from './templates-store';
import { useFunctionsStore } from './functions-store';

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
  addLineItem: (instanceId: string) => void;
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
        const moduleDef = useModulesStore.getState().getModule(moduleId);
        if (!moduleDef) return;
        
        const current = get().currentQuote;
        if (!current) {
          get().createQuote('New Quote');
          return get().addWorkspaceModule(moduleId);
        }
        
        // Initialize field values with defaults
        const fieldValues: Record<string, string | number | boolean> = {};
        for (const field of moduleDef.fields) {
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
        
        // Break any links pointing to this module
        const updatedModules = current.workspaceModules.map((module) => {
          if (module.id === instanceId) {
            return module; // Will be filtered out
          }
          
          // Check if this module has links pointing to the deleted module
          const links = module.fieldLinks || {};
          const hasBrokenLink = Object.values(links).some(
            (link) => link.moduleInstanceId === instanceId
          );
          
          if (hasBrokenLink) {
            // Remove broken links
            const cleanedLinks: Record<string, FieldLink> = {};
            Object.entries(links).forEach(([fieldName, link]) => {
              if (link.moduleInstanceId !== instanceId) {
                cleanedLinks[fieldName] = link;
              }
            });
            
            return {
              ...module,
              fieldLinks: Object.keys(cleanedLinks).length > 0 ? cleanedLinks : undefined,
            };
          }
          
          return module;
        });
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: updatedModules.filter((m) => m.id !== instanceId),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
      },
      
      reorderWorkspaceModules: (newOrder) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: newOrder,
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
      
      // Link management
      linkField: (instanceId, fieldName, targetInstanceId, targetFieldName) => {
        const current = get().currentQuote;
        if (!current) return { valid: false, error: 'No quote selected' };
        
        // Validate the link
        const validation = get().canLinkFields(instanceId, fieldName, targetInstanceId, targetFieldName);
        if (!validation.valid) {
          return validation;
        }
        
        // Update the field link
        set({
          currentQuote: {
            ...current,
            workspaceModules: current.workspaceModules.map((module) =>
              module.id === instanceId
                ? {
                    ...module,
                    fieldLinks: {
                      ...(module.fieldLinks || {}),
                      [fieldName]: {
                        moduleInstanceId: targetInstanceId,
                        fieldVariableName: targetFieldName,
                      },
                    },
                  }
                : module
            ),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
        return { valid: true };
      },
      
      unlinkField: (instanceId, fieldName) => {
        const current = get().currentQuote;
        if (!current) return;
        
        set({
          currentQuote: {
            ...current,
            workspaceModules: current.workspaceModules.map((module) =>
              module.id === instanceId
                ? {
                    ...module,
                    fieldLinks: (() => {
                      const links = { ...(module.fieldLinks || {}) };
                      delete links[fieldName];
                      return Object.keys(links).length > 0 ? links : undefined;
                    })(),
                  }
                : module
            ),
            updatedAt: new Date().toISOString(),
          },
        });
        
        get().recalculateWorkspaceModules();
      },
      
      // Validation helper functions
      canLinkFields: (instanceId, fieldName, targetInstanceId, targetFieldName) => {
        const current = get().currentQuote;
        if (!current) return { valid: false, error: 'No quote selected' };
        
        // Prevent self-linking
        if (instanceId === targetInstanceId && fieldName === targetFieldName) {
          return { valid: false, error: 'Cannot link field to itself' };
        }
        
        // Find source and target instances
        const sourceInstance = current.workspaceModules.find((m) => m.id === instanceId);
        const targetInstance = current.workspaceModules.find((m) => m.id === targetInstanceId);
        
        if (!sourceInstance) {
          return { valid: false, error: 'Source module instance not found' };
        }
        if (!targetInstance) {
          return { valid: false, error: 'Target module instance not found' };
        }
        
        // Get module definitions
        const sourceModule = useModulesStore.getState().getModule(sourceInstance.moduleId);
        const targetModule = useModulesStore.getState().getModule(targetInstance.moduleId);
        
        if (!sourceModule || !targetModule) {
          return { valid: false, error: 'Module definition not found' };
        }
        
        // Find field definitions
        const sourceField = sourceModule.fields.find((f) => f.variableName === fieldName);
        const targetField = targetModule.fields.find((f) => f.variableName === targetFieldName);
        
        if (!sourceField) {
          return { valid: false, error: 'Source field not found' };
        }
        if (!targetField) {
          return { valid: false, error: 'Target field not found' };
        }
        
        // Check type compatibility
        if (!get().areTypesCompatible(sourceField, targetField)) {
          return { valid: false, error: `Cannot link ${sourceField.type} field to ${targetField.type} field` };
        }
        
        // Check for circular references
        const cycle = get().detectCircularReference(instanceId, fieldName, targetInstanceId, targetFieldName);
        if (cycle) {
          return { valid: false, error: `Circular reference detected: ${cycle}` };
        }
        
        return { valid: true };
      },
      
      areTypesCompatible: (sourceField: Field, targetField: Field): boolean => {
        // Material types cannot be linked (per spec)
        if (sourceField.type === 'material' || targetField.type === 'material') {
          return false;
        }
        
        // Numeric types are compatible
        if (sourceField.type === 'number' && targetField.type === 'number') {
          // Check unit compatibility if both have unit categories
          if (sourceField.unitCategory && targetField.unitCategory) {
            return sourceField.unitCategory === targetField.unitCategory;
          }
          return true; // No units or one missing unit = compatible
        }
        
        // Boolean types are compatible
        if (sourceField.type === 'boolean' && targetField.type === 'boolean') {
          return true;
        }
        
        // String types (future - skip for MVP)
        // Dropdown types: only compatible if same type
        if (sourceField.type === 'dropdown' && targetField.type === 'dropdown') {
          return true;
        }
        
        return false;
      },
      
      detectCircularReference: (instanceId, fieldName, targetInstanceId, targetFieldName): string | null => {
        const current = get().currentQuote;
        if (!current) return null;
        
        // Build dependency graph
        const graph: Record<string, string[]> = {};
        current.workspaceModules.forEach((instance) => {
          Object.keys(instance.fieldValues).forEach((fName) => {
            const key = `${instance.id}.${fName}`;
            const link = instance.fieldLinks?.[fName];
            if (link) {
              const targetKey = `${link.moduleInstanceId}.${link.fieldVariableName}`;
              if (!graph[key]) {
                graph[key] = [];
              }
              graph[key].push(targetKey);
            }
          });
        });
        
        // Add the proposed link temporarily
        const sourceKey = `${instanceId}.${fieldName}`;
        const targetKey = `${targetInstanceId}.${targetFieldName}`;
        if (!graph[sourceKey]) {
          graph[sourceKey] = [];
        }
        graph[sourceKey].push(targetKey);
        
        // DFS to detect cycles
        const visited = new Set<string>();
        const recStack = new Set<string>();
        const path: string[] = [];
        
        function dfs(node: string): string | null {
          if (recStack.has(node)) {
            // Cycle detected
            const cycleStart = path.indexOf(node);
            const cycle = [...path.slice(cycleStart), node].join(' → ');
            return cycle;
          }
          
          if (visited.has(node)) {
            return null;
          }
          
          visited.add(node);
          recStack.add(node);
          path.push(node);
          
          const neighbors = graph[node] || [];
          for (const neighbor of neighbors) {
            const cycle = dfs(neighbor);
            if (cycle) {
              return cycle;
            }
          }
          
          recStack.delete(node);
          path.pop();
          return null;
        }
        
        return dfs(sourceKey);
      },
      
      // Line item management - these are committed items included in totals
      addLineItem: (instanceId) => {
        const current = get().currentQuote;
        if (!current) return;
        
        const instance = current.workspaceModules.find((m) => m.id === instanceId);
        if (!instance) return;
        
        const moduleDef = useModulesStore.getState().getModule(instance.moduleId);
        if (!moduleDef) return;
        
        // Resolve field links to get actual values (need all modules to resolve cross-module links)
        const resolvedValues = get().resolveFieldLinks(current.workspaceModules);
        const resolved = resolvedValues[instance.id] || instance.fieldValues;
        
        const materials = useMaterialsStore.getState().materials;
        const functions = useFunctionsStore.getState().functions;
        let cost = 0;
        try {
          cost = evaluateFormula(moduleDef.formula, {
            fieldValues: resolved,
            materials,
            functions,
          });
        } catch (error: any) {
          // If formula evaluation fails, show error and don't add line item
          console.error(`Error evaluating formula for module "${moduleDef.name}":`, error.message);
          alert(`Cannot add item: ${error.message || 'Formula evaluation failed'}`);
          return;
        }
        
        // Create a brief summary of key field values using resolved values
        const fieldSummary = moduleDef.fields
          .slice(0, 3) // Show first 3 fields
          .map((field) => {
            const value = resolved[field.variableName];
            return `${field.label}: ${value}`;
          })
          .join(', ');
        
        const lineItem: QuoteLineItem = {
            id: generateId(),
            moduleId: instance.moduleId,
            moduleName: moduleDef.name,
          fieldValues: { ...resolved }, // Snapshot of resolved values
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
      
      // Resolve field links to get final values for evaluation
      resolveFieldLinks: (instances: QuoteModuleInstance[]): Record<string, Record<string, any>> => {
        const resolved: Record<string, Record<string, any>> = {};
        const brokenLinks: Array<{ instanceId: string; fieldName: string }> = [];
        
        function resolve(instanceId: string, fieldName: string, path: string[]): any {
          const key = `${instanceId}.${fieldName}`;
          
          // Detect cycles
          if (path.includes(key)) {
            const cycleStart = path.indexOf(key);
            const cycle = [...path.slice(cycleStart), key].join(' → ');
            console.warn(`Circular reference detected: ${cycle}`);
            throw new Error(`Circular reference: ${cycle}`);
          }
          
          const instance = instances.find((i) => i.id === instanceId);
          if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
          }
          
          const link = instance.fieldLinks?.[fieldName];
          if (!link) {
            // No link, return direct value
            return instance.fieldValues[fieldName];
          }
          
          // Check if target exists
          const targetInstance = instances.find((i) => i.id === link.moduleInstanceId);
          if (!targetInstance) {
            brokenLinks.push({ instanceId, fieldName });
            // Return direct value as fallback
            return instance.fieldValues[fieldName];
          }
          
          // Check if target field exists
          if (!(link.fieldVariableName in targetInstance.fieldValues)) {
            brokenLinks.push({ instanceId, fieldName });
            // Return direct value as fallback
            return instance.fieldValues[fieldName];
          }
          
          // Resolve linked value recursively
          return resolve(link.moduleInstanceId, link.fieldVariableName, [...path, key]);
        }
        
        // Resolve all fields for all instances
        instances.forEach((instance) => {
          resolved[instance.id] = {};
          Object.keys(instance.fieldValues).forEach((fieldName) => {
            try {
              resolved[instance.id][fieldName] = resolve(instance.id, fieldName, []);
            } catch (error: any) {
              // Handle broken links or cycles - use direct value
              console.warn(`Error resolving link for ${instance.id}.${fieldName}:`, error.message);
              resolved[instance.id][fieldName] = instance.fieldValues[fieldName];
            }
          });
        });
        
        // Clean up broken links
        if (brokenLinks.length > 0) {
          const current = get().currentQuote;
          if (current) {
            let updatedModules = [...current.workspaceModules];
            brokenLinks.forEach(({ instanceId, fieldName }) => {
              updatedModules = updatedModules.map((module) =>
                module.id === instanceId
                  ? {
                      ...module,
                      fieldLinks: (() => {
                        const links = { ...(module.fieldLinks || {}) };
                        delete links[fieldName];
                        return Object.keys(links).length > 0 ? links : undefined;
                      })(),
                    }
                  : module
              );
            });
            
            set({
              currentQuote: {
                ...current,
                workspaceModules: updatedModules,
                updatedAt: new Date().toISOString(),
              },
            });
          }
        }
        
        return resolved;
      },
      
      // Recalculate workspace modules (for display only, not totals)
      recalculateWorkspaceModules: () => {
        const current = get().currentQuote;
        if (!current) return;
        
        const materials = useMaterialsStore.getState().materials;
        
        // Resolve all field links first
        const resolvedValues = get().resolveFieldLinks(current.workspaceModules);
        
        // Use resolved values for evaluation
        const updatedModules = current.workspaceModules.map((moduleInstance) => {
          const moduleDef = useModulesStore.getState().getModule(moduleInstance.moduleId);
          if (!moduleDef) return moduleInstance;
          
          const resolved = resolvedValues[moduleInstance.id] || moduleInstance.fieldValues;
          
          const functions = useFunctionsStore.getState().functions;
          let cost = 0;
          try {
            cost = evaluateFormula(moduleDef.formula, {
              fieldValues: resolved,
              materials,
              functions,
            });
          } catch (error: any) {
            // If formula evaluation fails, log error and set cost to 0
            console.error(`Error evaluating formula for module "${moduleDef.name}":`, error.message);
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
      
      // Template management
      createTemplateFromWorkspace: (name, description) => {
        const current = get().currentQuote;
        if (!current || current.workspaceModules.length === 0) {
          return null;
        }

        // Serialize module instances with new ID-based format
        // This matches the template editor's serializeForSave format
        const moduleInstances = current.workspaceModules.map(instance => {
          return {
            id: instance.id, // Preserve instance ID for stable references
            moduleId: instance.moduleId,
            fieldValues: { ...instance.fieldValues }, // Save field values
            fieldLinks: instance.fieldLinks && Object.keys(instance.fieldLinks).length > 0
              ? { ...instance.fieldLinks } // Keep ID-based links as-is
              : undefined,
          };
        });
        
        // Derive categories from module definitions
        const categories = Array.from(new Set(
          current.workspaceModules
            .map(instance => {
              const moduleDef = useModulesStore.getState().getModule(instance.moduleId);
              return moduleDef?.category;
            })
            .filter(Boolean) as string[]
        ));
        
        // Create template via templates store
        const template: Omit<ModuleTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
          name,
          description,
          moduleInstances,
          categories,
          createdFromQuoteId: current.id,
        };
        
        const createdTemplate = useTemplatesStore.getState().addTemplate(template);
        
        // Return the created template
        return createdTemplate;
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
        
        // Track created instances: map template index -> new instance ID
        const instanceMap: Map<number, string> = new Map();
        
        // First pass: Add all modules and track their new instance IDs
        for (let i = 0; i < template.moduleInstances.length; i++) {
          const templateInstance = template.moduleInstances[i];
          const moduleDef = useModulesStore.getState().getModule(templateInstance.moduleId);
          if (!moduleDef) {
            warnings.push(`Module "${templateInstance.moduleId}" no longer exists`);
            continue;
          }
          
          // Store current workspace length to find the new instance
          const beforeCount = get().currentQuote?.workspaceModules.length || 0;
          
          // Add module to workspace (creates new instance with default values)
          get().addWorkspaceModule(templateInstance.moduleId);
          
          // Get the newly created instance
          const updatedQuote = get().currentQuote;
          if (updatedQuote && updatedQuote.workspaceModules.length > beforeCount) {
            const newInstance = updatedQuote.workspaceModules[updatedQuote.workspaceModules.length - 1];
            instanceMap.set(i, newInstance.id);
            appliedModules++;
          }
        }
        
        // Second pass: Restore field links
        // The fieldLinks in template reference moduleInstanceId from original workspace
        // We need to map these to the new instance IDs by finding which template module they refer to
        const finalQuote = get().currentQuote;
        if (finalQuote) {
          // Build a map of old instance IDs to template indices
          // Since we can't know the old instance IDs, we'll use the order:
          // Links reference instance IDs, but we only have module order
          // We'll need to match by finding instances with matching moduleIds in order
          
          template.moduleInstances.forEach((templateInstance, sourceIndex) => {
            const sourceInstanceId = instanceMap.get(sourceIndex);
            if (!sourceInstanceId) return; // Skip if module wasn't added
            
            const sourceInstance = finalQuote.workspaceModules.find(i => i.id === sourceInstanceId);
            if (!sourceInstance) return;
            
            // Restore field links
            if (templateInstance.fieldLinks) {
              Object.entries(templateInstance.fieldLinks).forEach(([fieldName, link]) => {
                // Check link format and find target index
                let targetIndex: number | undefined;

                if (link.moduleInstanceId.startsWith('__index_')) {
                  // OLD FORMAT: Index-based (from legacy createTemplateFromWorkspace)
                  const indexStr = link.moduleInstanceId.replace('__index_', '').replace('__', '');
                  const parsedIndex = parseInt(indexStr, 10);
                  if (isNaN(parsedIndex)) {
                    warnings.push(`Link from "${fieldName}" could not be restored: invalid index format`);
                    return;
                  }
                  targetIndex = parsedIndex;
                } else {
                  // NEW FORMAT: ID-based (from template editor)
                  // Find which template instance has this ID
                  const targetTemplateIndex = template.moduleInstances.findIndex(
                    (inst: any) => inst.id === link.moduleInstanceId
                  );
                  if (targetTemplateIndex === -1) {
                    warnings.push(`Link from "${fieldName}" could not be restored: target instance not found in template`);
                    return;
                  }
                  targetIndex = targetTemplateIndex;
                }
                
                if (targetIndex === undefined || targetIndex < 0 || targetIndex >= template.moduleInstances.length) {
                  warnings.push(`Link from "${fieldName}" could not be restored: invalid target index`);
                  return;
                }
                
                const targetInstanceId = instanceMap.get(targetIndex);
                if (!targetInstanceId) {
                  warnings.push(`Link from "${fieldName}" could not be restored: target module was not added`);
                  return;
                }
                
                // Validate source field exists
                const sourceModule = useModulesStore.getState().getModule(templateInstance.moduleId);
                if (!sourceModule) return;
                
                const sourceField = sourceModule.fields.find(f => f.variableName === fieldName);
                if (!sourceField) return;
                
                // Validate target field exists
                const targetInstance = finalQuote.workspaceModules.find(i => i.id === targetInstanceId);
                if (!targetInstance) return;
                
                const targetModule = useModulesStore.getState().getModule(targetInstance.moduleId);
                if (!targetModule) return;
                
                const targetField = targetModule.fields.find(f => f.variableName === link.fieldVariableName);
                if (!targetField) {
                  warnings.push(`Link from "${fieldName}" could not be restored: target field "${link.fieldVariableName}" not found`);
                  return;
                }
                
                // Check type compatibility
                const canLink = get().canLinkFields(sourceInstanceId, fieldName, targetInstanceId, link.fieldVariableName);
                if (!canLink.valid) {
                  warnings.push(`Link from "${fieldName}" could not be restored: ${canLink.error || 'incompatible types'}`);
                  return;
                }
                
                // Restore the link
                const linkResult = get().linkField(sourceInstanceId, fieldName, targetInstanceId, link.fieldVariableName);
                if (!linkResult.valid) {
                  warnings.push(`Link from "${fieldName}" could not be restored: ${linkResult.error || 'unknown error'}`);
                }
              });
            }
          });
        }
        
        // Recalculate workspace modules
        get().recalculateWorkspaceModules();
        
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

