'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { QuoteModuleInstance, FieldType, CalculationModule, Field } from '@/lib/types';
import { normalizeToBase, convertFromBase } from '@/lib/units';
import { evaluateFormula } from '@/lib/formula-evaluator';
import { generateId } from '@/lib/utils';
import { canLinkFields, resolveFieldLinks } from '@/lib/utils/field-linking';
import { Plus, X, Trash2, ChevronDown, ChevronUp, GripVertical, AlertCircle, Link2, Unlink, CheckCircle2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableModuleCardProps {
  instance: QuoteModuleInstance;
  module: CalculationModule;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onRemove: (id: string) => void;
  renderFieldInput: (instance: QuoteModuleInstance, field: Field) => React.ReactNode;
}

function SortableModuleCard({
  instance,
  module,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  renderFieldInput,
}: SortableModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-elevated border border-border rounded-xl overflow-hidden transition-smooth elevation-1"
    >
      {/* Module Header */}
      <div className="flex items-center">
        {/* Drag Handle - Left Side */}
        <button
          {...attributes}
          {...listeners}
          className="p-3 text-muted-foreground hover:text-accent cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset transition-smooth"
          aria-label={`Drag to reorder ${module.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Interactive Header Content */}
        <div
          className="flex items-center justify-between flex-1 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-lg"
          onClick={() => onToggleCollapse(instance.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse(instance.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} module ${module.name}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-card-foreground">
                {module.name}
              </span>
              {module.category && (
                <span className="px-2.5 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
                  {module.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-success tabular-nums">
              ${instance.calculatedCost.toFixed(2)}
            </span>
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
            {/* Remove Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(instance.id);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Remove module"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Module Content */}
      {!isCollapsed && (
        <div className="px-4 pb-6">
          {module.description && (
            <p className="text-sm text-muted-foreground mb-5">{module.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {module.fields.map((field) => (
              <div key={field.id}>
                {renderFieldInput(instance, field)}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-border">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Module Cost</span>
            <span className="text-2xl font-bold text-success tabular-nums tracking-tight">
              ${instance.calculatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateEditorClientProps {
  templateId: string;
}

export function TemplateEditorClient({ templateId }: TemplateEditorClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ⚠️ ALL HOOKS MUST BE CALLED UNCONDITIONALLY ⚠️
  // Call all hooks before any conditional returns to ensure hooks order stability
  const router = useRouter();
  
  const template = useTemplatesStore((state) => state.getTemplate(templateId));
  const updateTemplate = useTemplatesStore((state) => state.updateTemplate);
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [workspaceModules, setWorkspaceModules] = useState<QuoteModuleInstance[]>([]);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [showAddModule, setShowAddModule] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Track which fields have link UI expanded: Map<instanceId, Map<fieldName, boolean>>
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});
  // Success toast state
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Recalculate module costs
  const recalculateModules = useCallback((modulesToRecalc: QuoteModuleInstance[]) => {
    // Resolve field links first
    const resolvedValues = resolveFieldLinks(modulesToRecalc);
    
    const updated = modulesToRecalc.map((instance) => {
      const moduleDef = modules.find((m) => m.id === instance.moduleId);
      if (!moduleDef) return instance;

      try {
        // Use resolved values (handles linked fields)
        const resolved = resolvedValues[instance.id] || instance.fieldValues;
        const result = evaluateFormula(moduleDef.formula, {
          fieldValues: resolved,
          materials,
          fields: moduleDef.fields.map(f => ({
            variableName: f.variableName,
            type: f.type,
            materialCategory: f.materialCategory,
          })),
        });

        return {
          ...instance,
          calculatedCost: result,
        };
      } catch (error) {
        return {
          ...instance,
          calculatedCost: 0,
        };
      }
    });

    setWorkspaceModules(updated);
  }, [modules, materials]);

  // Initialize template data
  useEffect(() => {
    if (!template) {
      router.push('/templates');
      return;
    }

    setTemplateName(template.name);
    setTemplateDescription(template.description || '');

    // Convert template.moduleInstances to QuoteModuleInstance[]
    // Convert field links from index-based format to new instance IDs
    const initialModules: QuoteModuleInstance[] = [];
    const instanceIdMap = new Map<number, string>(); // Map template index -> new instance ID
    
    // First pass: create all instances and build ID map
    template.moduleInstances.forEach((instance, index) => {
      const moduleDef = modules.find(m => m.id === instance.moduleId);
      if (!moduleDef) {
        // Module deleted - skip with warning
        return;
      }

      // Initialize field values with defaults
      const fieldValues: Record<string, string | number | boolean> = {};
      moduleDef.fields.forEach((field) => {
        if (field.variableName) {
          if (field.defaultValue !== undefined) {
            fieldValues[field.variableName] = field.defaultValue;
          } else {
            switch (field.type) {
              case 'number':
                fieldValues[field.variableName] = '';
                break;
              case 'boolean':
                fieldValues[field.variableName] = false;
                break;
              case 'dropdown':
                fieldValues[field.variableName] = '';
                break;
              case 'material':
                // If category exists, preselect first matching material
                let candidateMaterials = materials;
                if (field.materialCategory && field.materialCategory.trim()) {
                  candidateMaterials = materials.filter(m => m.category === field.materialCategory);
                }
                if (candidateMaterials.length > 0) {
                  fieldValues[field.variableName] = candidateMaterials[0].variableName;
                } else {
                  fieldValues[field.variableName] = '';
                }
                break;
              case 'text':
                fieldValues[field.variableName] = '';
                break;
            }
          }
        }
      });

      const newInstanceId = generateId();
      instanceIdMap.set(index, newInstanceId);

      initialModules.push({
        id: newInstanceId,
        moduleId: instance.moduleId,
        fieldValues,
        fieldLinks: {}, // Will be populated in second pass
        calculatedCost: 0,
      });
    });

    // Second pass: restore field links by converting index-based format to instance IDs
    template.moduleInstances.forEach((templateInstance, sourceIndex) => {
      const sourceInstanceId = instanceIdMap.get(sourceIndex);
      if (!sourceInstanceId || !templateInstance.fieldLinks) return;

      const sourceInstance = initialModules.find(m => m.id === sourceInstanceId);
      if (!sourceInstance) return;

      const restoredLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> = {};

      Object.entries(templateInstance.fieldLinks).forEach(([fieldName, link]) => {
        // Check if link uses index-based format
        if (link.moduleInstanceId.startsWith('__index_')) {
          const indexStr = link.moduleInstanceId.replace('__index_', '').replace('__', '');
          const targetIndex = parseInt(indexStr, 10);
          if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < template.moduleInstances.length) {
            const targetInstanceId = instanceIdMap.get(targetIndex);
            if (targetInstanceId) {
              restoredLinks[fieldName] = {
                moduleInstanceId: targetInstanceId,
                fieldVariableName: link.fieldVariableName,
              };
            }
          }
        }
      });

      if (Object.keys(restoredLinks).length > 0) {
        sourceInstance.fieldLinks = restoredLinks;
      }
    });

    setWorkspaceModules(initialModules);
    recalculateModules(initialModules);
  }, [template, modules, materials, router, recalculateModules]);

  // Update field value
  const updateFieldValue = useCallback((instanceId: string, fieldName: string, value: string | number | boolean) => {
    setWorkspaceModules((prev) => {
      const updated = prev.map((instance) =>
        instance.id === instanceId
          ? {
              ...instance,
              fieldValues: {
                ...instance.fieldValues,
                [fieldName]: value,
              },
            }
          : instance
      );
      recalculateModules(updated);
      return updated;
    });
  }, [recalculateModules]);

  // Add module
  const handleAddModule = useCallback((moduleId: string) => {
    const moduleDef = modules.find((m) => m.id === moduleId);
    if (!moduleDef) return;

    // Initialize field values with defaults
    const fieldValues: Record<string, string | number | boolean> = {};
    moduleDef.fields.forEach((field) => {
      if (field.variableName) {
        if (field.defaultValue !== undefined) {
          fieldValues[field.variableName] = field.defaultValue;
        } else {
          switch (field.type) {
            case 'number':
              fieldValues[field.variableName] = '';
              break;
            case 'boolean':
              fieldValues[field.variableName] = false;
              break;
            case 'dropdown':
              fieldValues[field.variableName] = '';
              break;
            case 'material':
              let candidateMaterials = materials;
              if (field.materialCategory && field.materialCategory.trim()) {
                candidateMaterials = materials.filter(m => m.category === field.materialCategory);
              }
              if (candidateMaterials.length > 0) {
                fieldValues[field.variableName] = candidateMaterials[0].variableName;
              } else {
                fieldValues[field.variableName] = '';
              }
              break;
            case 'text':
              fieldValues[field.variableName] = '';
              break;
          }
        }
      }
    });

    const newInstance: QuoteModuleInstance = {
      id: generateId(),
      moduleId,
      fieldValues,
      fieldLinks: {},
      calculatedCost: 0,
    };

    setWorkspaceModules((prev) => {
      const updated = [...prev, newInstance];
      recalculateModules(updated);
      return updated;
    });
  }, [modules, materials, recalculateModules]);

  // Remove module
  const handleRemoveModule = useCallback((instanceId: string) => {
    setWorkspaceModules((prev) => {
      const updated = prev.filter((m) => m.id !== instanceId);
      recalculateModules(updated);
      return updated;
    });
  }, [recalculateModules]);

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

  // Drag and drop - optimized with activation constraints and proper collision detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize sortable items array to prevent unnecessary re-renders
  const sortableItems = useMemo(
    () => workspaceModules.map(m => m.id),
    [workspaceModules]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Validate drag end conditions
    if (!over || active.id === over.id) return;

    // Find indices with validation
    const oldIndex = workspaceModules.findIndex((m) => m.id === active.id);
    const newIndex = workspaceModules.findIndex((m) => m.id === over.id);
    
    // Only proceed if both indices are valid
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Reorder modules
    const reordered = arrayMove(workspaceModules, oldIndex, newIndex);
    
    // Recalculate will update state with reordered array and recalculated costs
    // This avoids double state updates
    recalculateModules(reordered);
  };

  // Link management functions
  const linkField = useCallback((instanceId: string, fieldName: string, targetInstanceId: string, targetFieldName: string) => {
    // Validate the link
    const validation = canLinkFields(workspaceModules, modules, instanceId, fieldName, targetInstanceId, targetFieldName);
    if (!validation.valid) {
      return validation;
    }

    // Update the field link
    setWorkspaceModules((prev) => {
      const updated = prev.map((instance) =>
        instance.id === instanceId
          ? {
              ...instance,
              fieldLinks: {
                ...(instance.fieldLinks || {}),
                [fieldName]: {
                  moduleInstanceId: targetInstanceId,
                  fieldVariableName: targetFieldName,
                },
              },
            }
          : instance
      );
      recalculateModules(updated);
      return updated;
    });

    return { valid: true };
  }, [workspaceModules, modules, recalculateModules]);

  const unlinkField = useCallback((instanceId: string, fieldName: string) => {
    setWorkspaceModules((prev) => {
      const updated = prev.map((instance) =>
        instance.id === instanceId
          ? {
              ...instance,
              fieldLinks: (() => {
                const links = { ...(instance.fieldLinks || {}) };
                delete links[fieldName];
                return Object.keys(links).length > 0 ? links : undefined;
              })(),
            }
          : instance
      );
      recalculateModules(updated);
      return updated;
    });
  }, [recalculateModules]);

  // Helper functions for link UI
  const isFieldLinked = useCallback((instance: QuoteModuleInstance, fieldName: string): boolean => {
    return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
  }, []);

  const getResolvedValue = useCallback((instance: QuoteModuleInstance, fieldName: string): any => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return instance.fieldValues[fieldName];
    
    const targetInstance = workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return instance.fieldValues[fieldName];
    
    return targetInstance.fieldValues[link.fieldVariableName];
  }, [workspaceModules]);

  const isLinkBroken = useCallback((instance: QuoteModuleInstance, fieldName: string): boolean => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return false;
    
    const targetInstance = workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return true;
    
    const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
    if (!targetModule) return true;
    
    const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
    if (!targetField) return true;
    
    return false;
  }, [workspaceModules, modules]);

  const getLinkDisplayName = useCallback((instance: QuoteModuleInstance, fieldName: string): string => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return '';
    
    const targetInstance = workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return 'source unavailable';
    
    const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
    if (!targetModule) return 'source unavailable';
    
    const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
    if (!targetField) return 'source unavailable';
    
    return `${targetModule.name} — ${targetField.label}`;
  }, [workspaceModules, modules]);

  const buildLinkOptions = useCallback((instance: QuoteModuleInstance, field: { variableName: string; type: FieldType }) => {
    const options: Array<{ value: string; label: string }> = [
      { value: 'none', label: 'None' },
    ];
    
    // Group by module
    workspaceModules.forEach((otherInstance) => {
      if (otherInstance.id === instance.id) return; // Skip self
      
      const otherModule = modules.find((m) => m.id === otherInstance.moduleId);
      if (!otherModule) return;
      
      // Add separator
      options.push({ value: `sep-${otherInstance.id}`, label: `--- ${otherModule.name} ---` });
      
      // Add fields from this module (only compatible ones)
      otherModule.fields.forEach((otherField) => {
        // Skip material fields (cannot be linked per spec)
        if (otherField.type === 'material') return;
        
        // Skip self-link
        if (otherInstance.id === instance.id && otherField.variableName === field.variableName) return;
        
        // Check compatibility - only add compatible options
        const validation = canLinkFields(workspaceModules, modules, instance.id, field.variableName, otherInstance.id, otherField.variableName);
        if (validation.valid) {
          options.push({
            value: `${otherInstance.id}.${otherField.variableName}`,
            label: otherField.label,
          });
        }
      });
    });
    
    return options;
  }, [workspaceModules, modules]);

  const getCurrentLinkValue = useCallback((instance: QuoteModuleInstance, fieldName: string): string => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return 'none';
    return `${link.moduleInstanceId}.${link.fieldVariableName}`;
  }, []);

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
    
    const result = linkField(instance.id, fieldName, targetInstanceId, targetFieldName);
    if (!result.valid && result.error) {
      alert(result.error);
    } else {
      // Collapse UI after successful linking
      closeLinkUI(instance.id, fieldName);
    }
  }, [linkField, unlinkField, closeLinkUI]);

  // Helper to handle unlink
  const handleUnlink = useCallback((instanceId: string, fieldName: string) => {
    unlinkField(instanceId, fieldName);
    closeLinkUI(instanceId, fieldName);
  }, [unlinkField, closeLinkUI]);

  // Helper to generate unique template name
  const generateUniqueTemplateName = useCallback((baseName: string): string => {
    const allTemplates = useTemplatesStore.getState().templates;
    const existingNames = allTemplates.map(t => t.name.toLowerCase());
    
    // Check if base name is unique
    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    // Try " (Copy)"
    let candidate = `${baseName} (Copy)`;
    if (!existingNames.includes(candidate.toLowerCase())) {
      return candidate;
    }
    
    // Try " (Copy 2)", " (Copy 3)", etc.
    let counter = 2;
    do {
      candidate = `${baseName} (Copy ${counter})`;
      counter++;
    } while (existingNames.includes(candidate.toLowerCase()));
    
    return candidate;
  }, []);

  // Save As New Template
  const handleSaveAsNew = useCallback(() => {
    if (!template) return;

    // Build a map of instance IDs to indices for link conversion
    const instanceIdToIndex = new Map<string, number>();
    workspaceModules.forEach((instance, index) => {
      instanceIdToIndex.set(instance.id, index);
    });

    // Convert workspaceModules back to template format
    // Convert field links from instance IDs to index-based format
    const moduleInstances = workspaceModules.map((instance) => {
      const convertedLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> = {};
      
      if (instance.fieldLinks) {
        Object.entries(instance.fieldLinks).forEach(([fieldName, link]) => {
          const targetIndex = instanceIdToIndex.get(link.moduleInstanceId);
          if (targetIndex !== undefined) {
            // Convert to index-based format for template storage
            convertedLinks[fieldName] = {
              moduleInstanceId: `__index_${targetIndex}__`,
              fieldVariableName: link.fieldVariableName,
            };
          }
        });
      }

      return {
        moduleId: instance.moduleId,
        fieldLinks: Object.keys(convertedLinks).length > 0 ? convertedLinks : undefined,
      };
    });

    // Derive categories from module definitions
    const categories = Array.from(
      new Set(
        workspaceModules
          .map((instance) => {
            const moduleDef = modules.find((m) => m.id === instance.moduleId);
            return moduleDef?.category;
          })
          .filter(Boolean) as string[]
      )
    );

    // Generate unique name
    const baseName = templateName.trim() || template.name;
    const uniqueName = generateUniqueTemplateName(baseName);

    // Create new template and get the created template immediately
    const addTemplate = useTemplatesStore.getState().addTemplate;
    const newTemplate = addTemplate({
      name: uniqueName,
      description: templateDescription.trim() || template.description || undefined,
      moduleInstances,
      categories,
    });

    // Show success message
    setSaveSuccessMessage(uniqueName);
    setTimeout(() => setSaveSuccessMessage(null), 3000);

    // Navigate to new template editor immediately
    router.push(`/templates/editor?id=${newTemplate.id}`);
  }, [template, templateName, templateDescription, workspaceModules, modules, generateUniqueTemplateName, router, templateId]);

  // Save template
  const handleSaveTemplate = () => {
    if (!template) return;

    // Build a map of instance IDs to indices for link conversion
    const instanceIdToIndex = new Map<string, number>();
    workspaceModules.forEach((instance, index) => {
      instanceIdToIndex.set(instance.id, index);
    });

    // Convert workspaceModules back to template format
    // Convert field links from instance IDs to index-based format
    const moduleInstances = workspaceModules.map((instance) => {
      const convertedLinks: Record<string, { moduleInstanceId: string; fieldVariableName: string }> = {};
      
      if (instance.fieldLinks) {
        Object.entries(instance.fieldLinks).forEach(([fieldName, link]) => {
          const targetIndex = instanceIdToIndex.get(link.moduleInstanceId);
          if (targetIndex !== undefined) {
            // Convert to index-based format for template storage
            convertedLinks[fieldName] = {
              moduleInstanceId: `__index_${targetIndex}__`,
              fieldVariableName: link.fieldVariableName,
            };
          }
        });
      }

      return {
        moduleId: instance.moduleId,
        fieldLinks: Object.keys(convertedLinks).length > 0 ? convertedLinks : undefined,
      };
    });

    // Derive categories from module definitions
    const categories = Array.from(
      new Set(
        workspaceModules
          .map((instance) => {
            const moduleDef = modules.find((m) => m.id === instance.moduleId);
            return moduleDef?.category;
          })
          .filter(Boolean) as string[]
      )
    );

    updateTemplate(templateId, {
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      moduleInstances,
      categories,
    });

    router.push('/templates');
  };

  // Cancel
  const handleCancel = () => {
    router.push('/templates');
  };

  // Render field input (with linking UI - Phase 2)
  const renderFieldInput = useCallback((
    instance: QuoteModuleInstance,
    field: Field
  ) => {
    const isLinked = isFieldLinked(instance, field.variableName);
    const displayValue = isLinked ? getResolvedValue(instance, field.variableName) : instance.fieldValues[field.variableName];
    const value = displayValue;

    // Material fields cannot be linked (per spec)
    const canLink = field.type !== 'material';

    const formatLabel = (label: string, unit?: string, unitSymbol?: string) => {
      if (unitSymbol) return `${label} (${unitSymbol})`;
      if (unit) return `${label} (${unit})`;
      return label;
    };

    switch (field.type) {
      case 'number': {
        // For unit-aware fields, convert from base to display unit for input
        // Store values are always base-normalized
        let displayValue: number;
        if (field.unitSymbol && typeof value === 'number') {
          displayValue = convertFromBase(value, field.unitSymbol);
        } else {
          displayValue = typeof value === 'number' ? value : (value === '' ? 0 : Number(value) || 0);
        }
        
        const linkUIOpenForField = isLinkUIOpen(instance.id, field.variableName);

        return (
          <div>
            {/* Custom label with Link button */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex-1">
                <label className="block text-sm font-medium text-label-foreground">
              {formatLabel(field.label, field.unit, field.unitSymbol)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
              </div>
              {canLink && !isLinked && (
                <button
                  type="button"
                  onClick={() => toggleLinkUI(instance.id, field.variableName)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                  title="Link this field to another module field"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link</span>
                </button>
              )}
            </div>
            
            <div className={isLinked ? 'relative' : ''}>
            <Input
              type="number"
              value={isNaN(displayValue) ? '' : displayValue.toString()}
              onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                const inputValue = e.target.value === '' ? '' : Number(e.target.value) || 0;
                  // Convert to base unit if field has unitSymbol
                const baseValue = field.unitSymbol && typeof inputValue === 'number'
                  ? normalizeToBase(inputValue, field.unitSymbol)
                  : inputValue;
                updateFieldValue(instance.id, field.variableName, baseValue);
              }}
              required={field.required}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-full [background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] dark:[background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]"
                />
              )}
            </div>
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-accent'
                  }`}>
                    {broken 
                      ? 'Link broken: source unavailable'
                      : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlink(instance.id, field.variableName)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    {broken ? 'Remove Link' : 'Unlink'}
                  </Button>
                </div>
              );
            })()}
            
            {/* Link dropdown (only when expanded and not linked) */}
            {canLink && !isLinked && linkUIOpenForField && (
              <div className="mt-2">
                <Select
                  label="Link value from"
                  value={getCurrentLinkValue(instance, field.variableName)}
                  onChange={(e) => handleLinkChange(instance, field.variableName, e.target.value)}
                  options={buildLinkOptions(instance, field)}
                />
              </div>
            )}
          </div>
        );
      }
      case 'boolean': {
        const linkUIOpenForBoolean = isLinkUIOpen(instance.id, field.variableName);
        
        return (
          <div>
            {/* Custom label with Link button */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex-1">
                <label className="block text-sm font-medium text-label-foreground">
              {formatLabel(field.label, field.unit, field.unitSymbol)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
              </div>
              {canLink && !isLinked && (
                <button
                  type="button"
                  onClick={() => toggleLinkUI(instance.id, field.variableName)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                  title="Link this field to another module field"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link</span>
                </button>
              )}
            </div>
            
            <div className={isLinked ? 'relative' : ''}>
            <Checkbox
              label=""
              checked={Boolean(value)}
              onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                updateFieldValue(instance.id, field.variableName, e.target.checked);
              }}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded"
                  style={{
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0, 0, 0, 0.05) 4px, rgba(0, 0, 0, 0.05) 8px)'
                  }}
                />
              )}
            </div>
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-accent'
                  }`}>
                    {broken 
                      ? 'Link broken: source unavailable'
                      : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlink(instance.id, field.variableName)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    {broken ? 'Remove Link' : 'Unlink'}
                  </Button>
          </div>
        );
            })()}
            
            {/* Link dropdown (only when expanded and not linked) */}
            {canLink && !isLinked && linkUIOpenForBoolean && (
              <div className="mt-2">
                <Select
                  label="Link value from"
                  value={getCurrentLinkValue(instance, field.variableName)}
                  onChange={(e) => handleLinkChange(instance, field.variableName, e.target.value)}
                  options={buildLinkOptions(instance, field)}
                />
              </div>
            )}
          </div>
        );
      }
      case 'dropdown': {
        const options = field.options || [];
        const linkUIOpenForDropdown = isLinkUIOpen(instance.id, field.variableName);

        // Numeric dropdown mode: treat options as numeric values with units
        if (field.dropdownMode === 'numeric' && field.unitSymbol) {
          // Create display labels with units appended
          const displayOptions = options.map(opt => {
            const numValue = Number(opt.trim());
            if (!isNaN(numValue)) {
              return `${opt.trim()} ${field.unitSymbol}`;
            }
            return opt; // Fallback for non-numeric options
          });

          // Find current selection by matching base-normalized value
          let currentDisplayValue = '';
          if (typeof value === 'number') {
            // Convert stored base value back to display unit
            const displayValue = convertFromBase(value, field.unitSymbol);
            // Find matching option (with tolerance for floating point)
            const matchingIndex = options.findIndex(opt => {
              const optNum = Number(opt.trim());
              return !isNaN(optNum) && Math.abs(optNum - displayValue) < 0.0001;
            });
            if (matchingIndex >= 0) {
              currentDisplayValue = displayOptions[matchingIndex];
            } else {
              // Format the value if no exact match
              currentDisplayValue = `${displayValue} ${field.unitSymbol}`;
            }
          } else {
            currentDisplayValue = value?.toString() || '';
          }

          return (
            <div>
              {/* Custom label with Link button */}
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-label-foreground">
                {formatLabel(field.label, field.unit, field.unitSymbol)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
                {canLink && !isLinked && (
                  <button
                    type="button"
                    onClick={() => toggleLinkUI(instance.id, field.variableName)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                    title="Link this field to another module field"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>Link</span>
                  </button>
                )}
              </div>
              {field.description && (
                <p className="text-xs text-muted-foreground mb-1.5">
                  {field.description}
                </p>
              )}
              
              <div className={isLinked ? 'relative' : ''}>
              <Select
                label=""
                value={currentDisplayValue}
                onChange={(e) => {
                    if (isLinked) return; // Prevent changes when linked
                  const selectedDisplay = e.target.value;
                    // Extract numeric value from display string (e.g., "40 cm" -> 40)
                  const match = selectedDisplay.match(/^([\d.]+)/);
                  if (match && field.unitSymbol) {
                    const numValue = Number(match[1]);
                    if (!isNaN(numValue)) {
                        // Convert to base unit and store as number
                      const baseValue = normalizeToBase(numValue, field.unitSymbol);
                      updateFieldValue(instance.id, field.variableName, baseValue);
                    }
                  }
                }}
                options={[
                  { value: '', label: 'Select...' },
                  ...displayOptions.map((displayOpt) => ({
                    value: displayOpt,
                    label: displayOpt,
                  })),
                ]}
                  disabled={isLinked}
                />
                {isLinked && (
                  <div 
                    className="absolute inset-0 pointer-events-none rounded-full"
                    style={{
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0, 0, 0, 0.05) 4px, rgba(0, 0, 0, 0.05) 8px)'
                    }}
                  />
                )}
              </div>
              
              {/* Linked state UI */}
              {isLinked && (() => {
                const broken = isLinkBroken(instance, field.variableName);
                return (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                    {broken ? (
                      <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    )}
                    <span className={`text-xs flex-1 ${
                      broken ? 'text-destructive' : 'text-accent'
                    }`}>
                      {broken 
                        ? 'Link broken: source unavailable'
                        : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                      }
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlink(instance.id, field.variableName)}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Unlink className="h-3 w-3 mr-1" />
                      {broken ? 'Remove Link' : 'Unlink'}
                    </Button>
                  </div>
                );
              })()}
              
              {/* Link dropdown (only when expanded and not linked) */}
              {canLink && !isLinked && linkUIOpenForDropdown && (
                <div className="mt-2">
                  <Select
                    label="Link value from"
                    value={getCurrentLinkValue(instance, field.variableName)}
                    onChange={(e) => handleLinkChange(instance, field.variableName, e.target.value)}
                    options={buildLinkOptions(instance, field)}
                  />
                </div>
              )}
            </div>
          );
        }

        // String dropdown mode: original behavior
        return (
          <div>
            {/* Custom label with Link button */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex-1">
                <label className="block text-sm font-medium text-label-foreground">
              {formatLabel(field.label, field.unit, field.unitSymbol)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
              </div>
              {canLink && !isLinked && (
                <button
                  type="button"
                  onClick={() => toggleLinkUI(instance.id, field.variableName)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                  title="Link this field to another module field"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link</span>
                </button>
              )}
            </div>
            
            <div className={isLinked ? 'relative' : ''}>
            <Select
              label=""
              value={value?.toString() || ''}
              onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                updateFieldValue(instance.id, field.variableName, e.target.value);
              }}
              options={[
                { value: '', label: 'Select...' },
                ...options.map((opt) => ({ value: opt, label: opt })),
              ]}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-full [background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] dark:[background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]"
                />
              )}
            </div>
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-accent'
                  }`}>
                    {broken 
                      ? 'Link broken: source unavailable'
                      : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlink(instance.id, field.variableName)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    {broken ? 'Remove Link' : 'Unlink'}
                  </Button>
                </div>
              );
            })()}
            
            {/* Link dropdown (only when expanded and not linked) */}
            {canLink && !isLinked && linkUIOpenForDropdown && (
              <div className="mt-2">
                <Select
                  label="Link value from"
                  value={getCurrentLinkValue(instance, field.variableName)}
                  onChange={(e) => handleLinkChange(instance, field.variableName, e.target.value)}
                  options={buildLinkOptions(instance, field)}
                />
              </div>
            )}
          </div>
        );
      }
      case 'material': {
        const materialCategory = field.materialCategory;
        let availableMaterials = materials;

        if (materialCategory && materialCategory.trim()) {
          availableMaterials = materials.filter((mat) => mat.category === materialCategory);
        }

        const sortedMaterials = availableMaterials.sort((a, b) => a.name.localeCompare(b.name));

        return (
          <div>
            <div className="mb-1.5">
              <label className="block text-sm font-medium text-label-foreground">
                {formatLabel(field.label, field.unit, field.unitSymbol)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {field.description}
                </p>
              )}
            </div>
            <Select
              label=""
              value={value?.toString() || ''}
              onChange={(e) => {
                updateFieldValue(instance.id, field.variableName, e.target.value);
              }}
              options={[
                { value: '', label: 'Select a material...' },
                ...sortedMaterials.map((mat) => ({
                  value: mat.variableName,
                  label: `${mat.name} - $${mat.price.toFixed(2)}/${mat.unit}`,
                })),
              ]}
            />
            {materialCategory && sortedMaterials.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No materials available in category &quot;{materialCategory}&quot;.
              </p>
            )}
          </div>
        );
      }
      case 'text': {
        const linkUIOpenForText = isLinkUIOpen(instance.id, field.variableName);
        
        return (
          <div>
            {/* Custom label with Link button */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex-1">
                <label className="block text-sm font-medium text-label-foreground">
              {formatLabel(field.label, field.unit, field.unitSymbol)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
              </div>
              {canLink && !isLinked && (
                <button
                  type="button"
                  onClick={() => toggleLinkUI(instance.id, field.variableName)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                  title="Link this field to another module field"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link</span>
                </button>
              )}
            </div>
            
            <div className={isLinked ? 'relative' : ''}>
            <Input
              label=""
              value={value?.toString() || ''}
              onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                updateFieldValue(instance.id, field.variableName, e.target.value);
              }}
              required={field.required}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-full [background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] dark:[background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]"
                />
              )}
            </div>
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-accent'
                  }`}>
                    {broken 
                      ? 'Link broken: source unavailable'
                      : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlink(instance.id, field.variableName)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    {broken ? 'Remove Link' : 'Unlink'}
                  </Button>
          </div>
        );
            })()}
            
            {/* Link dropdown (only when expanded and not linked) */}
            {canLink && !isLinked && linkUIOpenForText && (
              <div className="mt-2">
                <Select
                  label="Link value from"
                  value={getCurrentLinkValue(instance, field.variableName)}
                  onChange={(e) => handleLinkChange(instance, field.variableName, e.target.value)}
                  options={buildLinkOptions(instance, field)}
                />
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  }, [
    materials,
    updateFieldValue,
    isFieldLinked,
    getResolvedValue,
    isLinkBroken,
    getLinkDisplayName,
    buildLinkOptions,
    getCurrentLinkValue,
    toggleLinkUI,
    isLinkUIOpen,
    handleLinkChange,
    handleUnlink,
  ]);

  // ⚠️ ALL HOOKS MUST BE ABOVE THIS LINE ⚠️
  // Prevent hydration mismatch - return null until client mount
  // This must be AFTER all hooks are called
  if (!mounted) {
    return null;
  }

  // Early return AFTER all hooks to ensure hooks order stability
  if (!template) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Template not found</p>
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

  // Check for deleted modules
  const hasDeletedModules = template.moduleInstances.some(
    (instance) => !modules.find((m) => m.id === instance.moduleId)
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Edit Template</h1>
        <p className="text-lg text-muted-foreground">Configure module combinations and field relationships</p>
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
          <Input
            label="Description (optional)"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Enter template description"
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
          <Card
            title="Select Module to Add"
            actions={
              <Button variant="ghost" size="sm" onClick={() => setShowAddModule(false)} className="rounded-full">
                Cancel
              </Button>
            }
          >
            {/* Category Filter Bar */}
            {usedCategories.length > 0 && (
              <div className="mb-4 pb-4 border-b border-border">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                      selectedCategory === null
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    All
                  </button>
                  {usedCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                        selectedCategory === category
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Single Modules Section */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3">Single Modules</h4>
              {filteredModules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredModules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => {
                        handleAddModule(module.id);
                        setShowAddModule(false);
                      }}
                      className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center active:scale-[0.98] bg-accent text-accent-foreground focus:ring-accent shadow-sm hover-glow hover-overlay px-4 py-2 text-base w-full"
                    >
                      <Plus className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate flex-1 text-left">{module.name}</span>
                      {module.category && (
                        <span className="ml-2 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full shrink-0">
                          {module.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedCategory ? `No modules in "${selectedCategory}" category.` : 'No modules available.'}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Empty State Card */}
        {!showAddModule && workspaceModules.length === 0 && (
          <Card>
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted shadow-sm mb-5">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2 tracking-tight">No modules in template</h4>
              <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed mb-5">
                Click &quot;Add Module&quot; to add modules to this template.
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
        {!showAddModule && workspaceModules.length > 0 && (
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
        {workspaceModules.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItems}
              strategy={verticalListSortingStrategy}
            >
              {workspaceModules.map((instance) => {
                const moduleDef = modules.find((m) => m.id === instance.moduleId);
                if (!moduleDef) {
                  // Module deleted - show warning badge
                  return (
                    <Card key={instance.id} className="border-destructive">
                      <div className="flex items-center gap-2 p-4">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="text-sm text-destructive">
                          Module no longer exists
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModule(instance.id)}
                          className="ml-auto"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  );
                }

                return (
                  <SortableModuleCard
                    key={instance.id}
                    instance={instance}
                    module={moduleDef}
                    isCollapsed={collapsedModules.has(instance.id)}
                    onToggleCollapse={toggleModuleCollapse}
                    onRemove={handleRemoveModule}
                    renderFieldInput={renderFieldInput}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
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
      <div className="fixed bottom-0 left-0 right-0 bg-panel/95 backdrop-blur-md border-t border-border shadow-xl px-4 py-4 z-40 elevation-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <Button onClick={() => setShowAddModule(true)} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleCancel} className="rounded-full">
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveAsNew} className="rounded-full">
              Save As New Template
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

