'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { QuoteModuleInstance, FieldType } from '@/lib/types';
import { normalizeToBase, convertFromBase } from '@/lib/units';
import { Plus, X, Download, Send, Trash2, Save, Package, Calculator, LayoutDashboard, Link2, Unlink, ChevronDown, ChevronUp } from 'lucide-react';

export default function QuotesPage() {
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const createQuote = useQuotesStore((state) => state.createQuote);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const addWorkspaceModule = useQuotesStore((state) => state.addWorkspaceModule);
  const removeWorkspaceModule = useQuotesStore((state) => state.removeWorkspaceModule);
  const updateWorkspaceModuleFieldValue = useQuotesStore((state) => state.updateWorkspaceModuleFieldValue);
  const linkField = useQuotesStore((state) => state.linkField);
  const unlinkField = useQuotesStore((state) => state.unlinkField);
  const canLinkFields = useQuotesStore((state) => state.canLinkFields);
  const addLineItem = useQuotesStore((state) => state.addLineItem);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const saveQuote = useQuotesStore((state) => state.saveQuote);

  const [quoteName, setQuoteName] = useState('New Quote');
  const [showAddModule, setShowAddModule] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  // Track which fields have link UI expanded: Map<instanceId, Map<fieldName, boolean>>
  const [linkUIOpen, setLinkUIOpen] = useState<Record<string, Record<string, boolean>>>({});
  // Track which modules are collapsed: Set<instanceId>
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentQuote) {
      createQuote('New Quote');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentQuote) {
      setQuoteName(currentQuote.name);
    }
  }, [currentQuote?.id]); // Only update when quote ID changes

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

  // Helper to format label with unit
  const formatLabel = (label: string, unit?: string, unitSymbol?: string) => {
    const displayUnit = unitSymbol || unit;
    return displayUnit ? `${label} (${displayUnit})` : label;
  };

  // Helper to check if field is linked
  const isFieldLinked = (instance: QuoteModuleInstance, fieldName: string): boolean => {
    return !!(instance.fieldLinks && instance.fieldLinks[fieldName]);
  };

  // Helper to get current link value for dropdown
  const getCurrentLinkValue = (instance: QuoteModuleInstance, fieldName: string): string => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return 'none';
    return `${link.moduleInstanceId}.${link.fieldVariableName}`;
  };

  // Helper to check if link is broken
  const isLinkBroken = (instance: QuoteModuleInstance, fieldName: string): boolean => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return false;
    
    const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return true;
    
    const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
    if (!targetModule) return true;
    
    const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
    if (!targetField) return true;
    
    return false;
  };

  // Helper to get link display name
  const getLinkDisplayName = (instance: QuoteModuleInstance, fieldName: string): string => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return '';
    
    const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return 'source unavailable';
    
    const targetModule = modules.find((m) => m.id === targetInstance.moduleId);
    if (!targetModule) return 'source unavailable';
    
    const targetField = targetModule.fields.find((f) => f.variableName === link.fieldVariableName);
    if (!targetField) return 'source unavailable';
    
    return `${targetModule.name} — ${targetField.label}`;
  };

  // Helper to build link options for dropdown
  const buildLinkOptions = (instance: QuoteModuleInstance, field: { variableName: string; type: FieldType }) => {
    if (!currentQuote) return [{ value: 'none', label: 'None' }];
    
    const options: Array<{ value: string; label: string }> = [
      { value: 'none', label: 'None' },
    ];
    
    // Group by module
    currentQuote.workspaceModules.forEach((otherInstance) => {
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
  };

  // Helper to toggle link UI expansion
  const toggleLinkUI = (instanceId: string, fieldName: string) => {
    setLinkUIOpen((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || {}),
        [fieldName]: !prev[instanceId]?.[fieldName],
      },
    }));
  };

  // Helper to check if link UI is open
  const isLinkUIOpen = (instanceId: string, fieldName: string): boolean => {
    return !!(linkUIOpen[instanceId]?.[fieldName]);
  };

  // Helper to close link UI
  const closeLinkUI = (instanceId: string, fieldName: string) => {
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
  };

  // Helper to handle link change
  const handleLinkChange = (instance: QuoteModuleInstance, fieldName: string, value: string) => {
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
  };

  // Helper to handle unlink
  const handleUnlink = (instanceId: string, fieldName: string) => {
    unlinkField(instanceId, fieldName);
    closeLinkUI(instanceId, fieldName);
  };

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
  const getResolvedValue = (instance: QuoteModuleInstance, fieldName: string): any => {
    const link = instance.fieldLinks?.[fieldName];
    if (!link) return instance.fieldValues[fieldName];
    
    const targetInstance = currentQuote?.workspaceModules.find((m) => m.id === link.moduleInstanceId);
    if (!targetInstance) return instance.fieldValues[fieldName];
    
    return targetInstance.fieldValues[link.fieldVariableName];
  };

  const renderFieldInput = (
    instance: QuoteModuleInstance,
    field: { id: string; label: string; type: FieldType; variableName: string; options?: string[]; dropdownMode?: 'numeric' | 'string'; required?: boolean; materialCategory?: string; unit?: string; unitSymbol?: string; unitCategory?: string }
  ) => {
    const isLinked = isFieldLinked(instance, field.variableName);
    const displayValue = isLinked ? getResolvedValue(instance, field.variableName) : instance.fieldValues[field.variableName];
    const value = displayValue;
    const module = modules.find((m) => m.id === instance.moduleId);
    
    // Material fields cannot be linked (per spec)
    const canLink = field.type !== 'material';

    switch (field.type) {
      case 'number': {
        // For unit-aware fields, convert from base to display unit for input
        // Store values are always base-normalized
        let displayValue: number;
        if (field.unitSymbol && typeof value === 'number') {
          displayValue = convertFromBase(value, field.unitSymbol);
        } else {
          displayValue = typeof value === 'number' ? value : 0;
        }
        
        const linkUIOpenForField = isLinkUIOpen(instance.id, field.variableName);
        
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
            
            <div className={isLinked ? 'relative' : ''}>
              <Input
                type="number"
                value={displayValue.toString()}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  const inputValue = Number(e.target.value) || 0;
                  // Convert to base unit if field has unitSymbol
                  const baseValue = field.unitSymbol 
                    ? normalizeToBase(inputValue, field.unitSymbol)
                    : inputValue;
                  updateWorkspaceModuleFieldValue(instance.id, field.variableName, baseValue);
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
                    <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'
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
      case 'boolean':
        const linkUIOpenForBoolean = isLinkUIOpen(instance.id, field.variableName);
        
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
            
            <div className={isLinked ? 'relative' : ''}>
              <Checkbox
                label=""
                checked={Boolean(value)}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.checked);
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
                    <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'
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
                        updateWorkspaceModuleFieldValue(instance.id, field.variableName, baseValue);
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
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(59, 130, 246, 0.08) 4px, rgba(59, 130, 246, 0.08) 8px)'
                    }}
                  />
                )}
              </div>
              
              {/* Linked state UI */}
              {isLinked && (() => {
                const broken = isLinkBroken(instance, field.variableName);
                return (
                  <div className={`mt-2 flex items-center gap-2 p-2 rounded-md border ${
                    broken 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-muted/30 border-border/50'
                  }`}>
                    {broken ? (
                      <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-xs flex-1 ${
                      broken ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {broken 
                        ? 'Link broken: source unavailable'
                        : `Linked to: ${getLinkDisplayName(instance, field.variableName)}`
                      }
                    </span>
                    <Button
                      size="sm"
                      variant={broken ? 'danger' : 'secondary'}
                      onClick={() => handleUnlink(instance.id, field.variableName)}
                      className="h-6 text-xs"
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
        
        // String dropdown mode: original behavior (unchanged)
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
            
            <div className={isLinked ? 'relative' : ''}>
              <Select
                label=""
                value={value?.toString() || ''}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value);
                }}
                options={[
                  { value: '', label: 'Select...' },
                  ...options.map((opt) => ({ value: opt, label: opt })),
                ]}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-full [background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] dark:[background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.12)_4px,rgba(255,255,255,0.12)_8px)]"
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
                    <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'
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
      case 'material':
        // Material picker: show materials with display name, price, and unit
        // Filter by materialCategory if specified on the field
        // materialCategory allows module authors to limit material choices to a specific category
        // (e.g., only "Lumber" materials for a framing module)
        const materialCategory = field.materialCategory;
        let availableMaterials = materials;
        
        if (materialCategory && materialCategory.trim()) {
          availableMaterials = materials.filter((mat) => mat.category === materialCategory);
        }
        
        // Sort materials alphabetically
        const sortedMaterials = availableMaterials.sort((a, b) => a.name.localeCompare(b.name));
        
        return (
          <div>
            <Select
              label={formatLabel(field.label, field.unit, field.unitSymbol)}
              value={value?.toString() || ''}
              onChange={(e) =>
                updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value)
              }
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
                No materials available in category &quot;{materialCategory}&quot;. Please add materials or adjust the field&apos;s category.
              </p>
            )}
          </div>
        );
      case 'text':
        const linkUIOpenForText = isLinkUIOpen(instance.id, field.variableName);
        
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
            
            <div className={isLinked ? 'relative' : ''}>
              <Input
                label=""
                value={value?.toString() || ''}
                onChange={(e) => {
                  if (isLinked) return; // Prevent changes when linked
                  updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value);
                }}
                required={field.required}
                disabled={isLinked}
              />
              {isLinked && (
                <div 
                  className="absolute inset-0 pointer-events-none rounded-full [background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)] dark:[background:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.12)_4px,rgba(255,255,255,0.12)_8px)]"
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
                    <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${
                    broken ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'
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
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (!currentQuote) return;

    const module = useModulesStore.getState();
    const quoteData = {
      quote: {
        name: currentQuote.name,
        createdAt: currentQuote.createdAt,
        lineItems: currentQuote.lineItems.map((item) => ({
          moduleName: item.moduleName,
          fields: Object.entries(item.fieldValues).map(([key, value]) => {
            const mod = module.getModule(item.moduleId);
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

    const module = useModulesStore.getState();
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
              <Calculator className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground">Loading quote builder...</p>
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
          <p className="text-lg text-muted-foreground">Build comprehensive construction cost estimates</p>
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

          {/* Add Module Card */}
          {showAddModule && (
            <Card 
              title="Select Module to Add"
              actions={
                <Button variant="ghost" size="sm" onClick={() => setShowAddModule(false)} className="rounded-full">
                  Cancel
                </Button>
              }
              className=""
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handleAddModule(module.id)}
                    className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center active:scale-[0.98] bg-accent text-accent-foreground focus:ring-accent shadow-sm hover-glow hover-overlay px-4 py-2 text-base w-full"
                  >
                    <Plus className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{module.name}</span>
                  </button>
                ))}
              </div>
              {modules.length === 0 && (
                <div className="text-center py-8">
                  <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No modules available.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create modules first to add them to quotes.</p>
                </div>
              )}
            </Card>
          )}

          {/* Empty State Card */}
          {!showAddModule && currentQuote.workspaceModules.length === 0 && (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted shadow-sm mb-5">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2 tracking-tight">No modules in workspace</h4>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed mb-5">
                  Click "Add Module" to get started, then configure and add them to your quote.
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
            <>
              {currentQuote.workspaceModules.map((instance) => {
                const module = modules.find((m) => m.id === instance.moduleId);
                if (!module) return null;

                const isCollapsed = isModuleCollapsed(instance.id);

                return (
                  <Card 
                    key={instance.id} 
                    title={module.name}
                    className="overlay-white"
                    actions={
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(instance.id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                        aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronUp className="h-5 w-5" />
                        )}
                      </button>
                    }
                  >
                    {!isCollapsed && (
                      <>
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
                      </>
                    )}

                    <div className="flex items-center justify-between pt-5 border-t border-border">
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Module Cost</span>
                      <span className="text-2xl font-bold text-success tabular-nums tracking-tight">
                        ${instance.calculatedCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-border">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          addLineItem(instance.id);
                          setAddedItems(new Set([...addedItems, instance.id]));
                          setTimeout(() => {
                            setAddedItems(new Set());
                          }, 2000);
                        }}
                        className="rounded-full flex-1 sm:flex-initial"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        {addedItems.has(instance.id) ? 'Added!' : 'Add to Quote'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeWorkspaceModule(instance.id)}
                        className="rounded-full"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-[88px] z-40">
            <h3 className="text-lg font-bold text-card-foreground mb-5 tracking-tight">Quote Summary</h3>
            
            <div className="space-y-5">
              {/* Financial Breakdown */}
              <div className="space-y-3">
                {/* Subtotal Row */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Subtotal</label>
                  <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                    <span className="font-semibold text-card-foreground tabular-nums text-sm">
                      ${currentQuote.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Markup % Input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Markup (%)</label>
                  <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={Math.round(currentQuote.markupPercent ?? 0).toString()}
                      onChange={(e) => {
                        const percent = Math.round(Number(e.target.value) || 0);
                        setMarkupPercent(Math.max(0, percent));
                      }}
                      className="w-full text-right font-semibold text-card-foreground tabular-nums text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0"
                    />
                  </div>
                </div>

                {/* Markup Amount Display (only if markup > 0) */}
                {(currentQuote.markupPercent ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-label-foreground shrink-0">Markup</label>
                    <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                      <span className="font-semibold text-card-foreground tabular-nums text-sm">
                        ${(currentQuote.markupAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tax Rate % Input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Tax Rate (%)</label>
                  <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(currentQuote.taxRate * 100).toString()}
                      onChange={(e) => {
                        const rate = Math.round(Number(e.target.value) || 0) / 100;
                        setTaxRate(Math.max(0, Math.min(1, rate)));
                      }}
                      className="w-full text-right font-semibold text-card-foreground tabular-nums text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0"
                    />
                  </div>
                </div>

                {/* Tax Amount Display (only if tax rate > 0) */}
                {(currentQuote.taxRate ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-label-foreground shrink-0">Tax</label>
                    <div className="w-20 shrink-0 text-right flex items-center justify-end h-[44px]">
                      <span className="font-semibold text-card-foreground tabular-nums text-sm">
                        ${currentQuote.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-baseline p-4 -mx-2">
                  <span className="text-base font-bold text-card-foreground">Total</span>
                  <span className="text-3xl font-bold text-accent tabular-nums tracking-tight">
                    ${currentQuote.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="pt-5 border-t border-border">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Line Items</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {currentQuote.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between gap-3 p-3 rounded-lg transition-smooth"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-card-foreground text-sm mb-0.5 truncate">
                          {item.moduleName}
                        </div>
                        <div className="text-muted-foreground text-xs truncate">
                          {item.fieldSummary}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-card-foreground text-sm tabular-nums">
                          ${item.cost.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-md text-destructive"
                          title="Remove item"
                          aria-label={`Remove line item: ${item.moduleName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentQuote.lineItems.length === 0 && (
                    <div className="text-center py-8">
                      <Calculator className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        No items in quote yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure modules and click "Add to Quote"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-5 border-t border-border">
                <Button
                  variant="primary"
                  className="w-full rounded-full"
                  onClick={() => {
                    alert('Send Quote functionality would integrate with your email/CRM system.');
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div data-bottom-action-bar className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-xl px-4 py-4 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-3">
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
