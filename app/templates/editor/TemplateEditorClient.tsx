'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { QuoteModuleInstance, FieldType, Field } from '@/lib/types';
import { normalizeToBase, convertFromBase } from '@/lib/units';
import { Plus, X, Trash2, AlertCircle, Link2, Unlink, CheckCircle2 } from 'lucide-react';
import { FieldHeader, FieldDescription } from '@/components/module-editor/FieldHeader';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableModuleCard } from '@/components/SortableModuleCard';
import { Textarea } from '@/components/ui/Textarea';
import { useTemplateEditor } from '@/hooks/use-template-editor';
interface TemplateEditorClientProps {
  templateId: string;
}

export function TemplateEditorClient({ templateId }: TemplateEditorClientProps) {
  // ⚠️ ALL HOOKS MUST BE CALLED UNCONDITIONALLY ⚠️
  // Call all hooks before any conditional returns to ensure hooks order stability
  const router = useRouter();
  
  // Use object selector to get all template store functions (single subscription)
  const { getTemplate, updateTemplate, addTemplate } = useTemplatesStore((state) => ({
    getTemplate: state.getTemplate,
    updateTemplate: state.updateTemplate,
    addTemplate: state.addTemplate,
  }));
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  
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
    reorderModules(String(active.id), over ? String(over.id) : null, sortableItems);
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
            <FieldHeader
              label={field.label}
              unit={field.unit}
              unitSymbol={field.unitSymbol}
              required={field.required}
              showLink={canLink}
              isLinked={isLinked}
              onLinkClick={() => toggleLinkUI(instance.id, field.variableName)}
            />
            
            {/* Fixed height container for input to ensure alignment */}
            <div className="h-[46px] flex items-center">
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
                className="w-full"
              />
            </div>
            
            {/* Description below input */}
            <FieldDescription description={field.description} />
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-md-error shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-md-error' : 'text-md-primary'
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
                    className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface"
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
            <FieldHeader
              label={field.label}
              unit={field.unit}
              unitSymbol={field.unitSymbol}
              required={field.required}
              showLink={canLink}
              isLinked={isLinked}
              onLinkClick={() => toggleLinkUI(instance.id, field.variableName)}
            />
            
            {/* Fixed height container for checkbox to ensure alignment */}
            <div className="h-[46px] flex items-center">
              <Checkbox
                label=""
                checked={Boolean(value)}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  updateFieldValue(instance.id, field.variableName, e.target.checked);
                }}
                disabled={isLinked}
              />
            </div>
            
            {/* Description below input */}
            <FieldDescription description={field.description} />
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-md-error shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-md-error' : 'text-md-primary'
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
                    className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface"
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
              <FieldHeader
                label={field.label}
                unit={field.unit}
                unitSymbol={field.unitSymbol}
                required={field.required}
                showLink={canLink}
                isLinked={isLinked}
                onLinkClick={() => toggleLinkUI(instance.id, field.variableName)}
              />
              
              {/* Fixed height container for select to ensure alignment */}
              <div className="h-[46px] flex items-center">
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
                  className="w-full"
                />
              </div>
              
              {/* Description below input */}
              <FieldDescription description={field.description} />
              
              {/* Linked state UI */}
              {isLinked && (() => {
                const broken = isLinkBroken(instance, field.variableName);
                return (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                    {broken ? (
                      <X className="h-3.5 w-3.5 text-md-error shrink-0" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
                    )}
                    <span className={`text-xs flex-1 ${
                      broken ? 'text-md-error' : 'text-md-primary'
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
                      className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface"
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
              <FieldHeader
                label={field.label}
                unit={field.unit}
                unitSymbol={field.unitSymbol}
                required={field.required}
                showLink={canLink}
                isLinked={isLinked}
                onLinkClick={() => toggleLinkUI(instance.id, field.variableName)}
              />
            
            {/* Fixed height container for select to ensure alignment */}
            <div className="h-[46px] flex items-center">
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
                className="w-full"
              />
            </div>
            
            {/* Description below input */}
            <FieldDescription description={field.description} />
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-md-error shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-md-error' : 'text-md-primary'
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
                    className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface"
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
            <FieldHeader
              label={field.label}
              unit={field.unit}
              unitSymbol={field.unitSymbol}
              required={field.required}
            />
            {/* Fixed height container for select to ensure alignment */}
            <div className="h-[46px] flex items-center">
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
                className="w-full"
              />
            </div>
            {/* Description below input */}
            <FieldDescription description={field.description} />
            {materialCategory && sortedMaterials.length === 0 && (
              <p className="text-xs text-md-on-surface-variant mt-1">
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
            <FieldHeader
              label={field.label}
              unit={field.unit}
              unitSymbol={field.unitSymbol}
              required={field.required}
              showLink={canLink}
              isLinked={isLinked}
              onLinkClick={() => toggleLinkUI(instance.id, field.variableName)}
            />
            
            {/* Fixed height container for input to ensure alignment */}
            <div className="h-[46px] flex items-center">
              <Input
                label=""
                value={value?.toString() || ''}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  updateFieldValue(instance.id, field.variableName, e.target.value);
                }}
                required={field.required}
                disabled={isLinked}
                className="w-full"
              />
            </div>
            
            {/* Description below input */}
            <FieldDescription description={field.description} />
            
            {/* Linked state UI */}
            {isLinked && (() => {
              const broken = isLinkBroken(instance, field.variableName);
              return (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
                  {broken ? (
                    <X className="h-3.5 w-3.5 text-md-error shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-md-error' : 'text-md-primary'
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
                    className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface"
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
  // Early return AFTER all hooks to ensure hooks order stability
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
                      ? 'bg-accent text-md-on-primary'
                        : 'bg-muted text-md-on-surface-variant hover:bg-muted/80'
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
                          ? 'bg-accent text-md-on-primary'
                          : 'bg-muted text-md-on-surface-variant hover:bg-muted/80'
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
                      className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-md-surface inline-flex items-center justify-center active:scale-[0.98] bg-accent text-md-on-primary focus:ring-accent elevation-1 hover-glow hover-overlay px-4 py-2 text-base w-full"
                    >
                      <Plus className="h-4 w-4 mr-2 shrink-0" />
                      <span className="truncate flex-1 text-left">{module.name}</span>
                      {module.category && (
                        <span className="ml-2 px-2 py-0.5 bg-accent/20 text-md-primary text-xs rounded-full shrink-0">
                          {module.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-md-on-surface-variant">
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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted elevation-1 mb-5">
                <Plus className="h-10 w-10 text-md-on-surface-variant" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2 tracking-tight">No modules in template</h4>
              <p className="text-base text-md-on-surface-variant max-w-md mx-auto leading-relaxed mb-5">
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
                        <AlertCircle className="h-5 w-5 text-md-error" />
                        <span className="text-sm text-md-error">
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
                    borderClassName="border-md-outline"
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
