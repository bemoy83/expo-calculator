'use client';

import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Chip } from '@/components/ui/Chip';
import { useLaborStore } from '@/lib/stores/labor-store';
import { Labor, LaborProperty, COMMON_LABOR_PROPERTIES } from '@/lib/types';
import { labelToVariableName, generateId } from '@/lib/utils';
import { getAllUnitSymbols, getUnitCategory, normalizeToBase, convertFromBase } from '@/lib/units';
import { Plus, Edit2, Trash2, Search, Users } from 'lucide-react';
import { LaborPropertyForm } from '@/components/labor/LaborPropertyForm';
import { SortableList } from '@/components/shared/SortableList';
import { LaborItem } from '@/components/labor/LaborItem';
import { CategoryChipSelector } from '@/components/shared/CategoryChipSelector';

/**
 * Labor Manager Page
 * 
 * Enterprise-grade labor catalog with split workspace:
 * - Left: Labor catalog with search and filtering
 * - Right: Labor editor sidebar (create/edit)
 * 
 * Labor items represent hourly rates and productivity rates (e.g., m²/hour, pcs/hour)
 * used in formula calculations. Variable names are critical - they're referenced in calculation formulas.
 */
export default function LaborPage() {
  const labor = useLaborStore((state) => state.labor);
  const addLabor = useLaborStore((state) => state.addLabor);
  const updateLabor = useLaborStore((state) => state.updateLabor);
  const deleteLabor = useLaborStore((state) => state.deleteLabor);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedLaborId, setSelectedLaborId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
    variableName: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<LaborProperty[]>([]);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<{
    name: string;
    value: number;
    unitSymbol?: string;
  }>({
    name: '',
    value: 0,
    unitSymbol: undefined,
  });
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [collapsedLabor, setCollapsedLabor] = useState<Set<string>>(
    () => new Set(labor.map((l) => l.id))
  );

  // Keep new labor items collapsed by default while preserving user toggles
  useEffect(() => {
    setCollapsedLabor((prev) => {
      const next = new Set(prev);
      labor.forEach((item) => {
        if (!next.has(item.id)) {
          next.add(item.id);
        }
      });
      return next;
    });
  }, [labor]);

  // Get all unique categories (filter out "custom" as it's not meaningful)
  const categories = useMemo(() => {
    return Array.from(new Set(labor.map((l) => l.category)))
      .filter(cat => cat && cat.toLowerCase() !== 'custom')
      .sort();
  }, [labor]);

  const sortedByOrder = useMemo(() => {
    return [...labor].sort((a, b) => {
      const orderA = a.order ?? labor.indexOf(a);
      const orderB = b.order ?? labor.indexOf(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [labor]);

  // Filter labor based on search and category
  const filteredLabor = useMemo(() => {
    let filtered = sortedByOrder;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((l) => l.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.variableName.toLowerCase().includes(query) ||
          l.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [sortedByOrder, categoryFilter, searchQuery]);

  const canReorder = !searchQuery.trim() && categoryFilter === 'all';

  const openEditor = (laborItem?: Labor) => {
    if (laborItem) {
      setSelectedLaborId(laborItem.id);
      setFormData({
        name: laborItem.name,
        category: laborItem.category,
        cost: laborItem.cost.toString(),
        variableName: laborItem.variableName,
        description: laborItem.description || '',
      });
      setProperties(laborItem.properties ? [...laborItem.properties] : []);
    } else {
      setSelectedLaborId(null);
      setFormData({
        name: '',
        category: '',
        cost: '',
        variableName: '',
        description: '',
      });
      setProperties([]);
    }
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty({ name: '', value: 0, unitSymbol: undefined });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedLaborId(null);
    setFormData({
      name: '',
      category: '',
      cost: '',
      variableName: '',
      description: '',
    });
    setProperties([]);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty({ name: '', value: 0, unitSymbol: undefined });
  };

  const validatePropertyName = (name: string, excludeId?: string): string | null => {
    if (!name.trim()) {
      return 'Property name is required';
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return 'Property name must start with a letter or underscore and contain only letters, numbers, and underscores';
    }
    // Check for duplicate property names within the same labor item
    const duplicate = properties.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
    );
    if (duplicate) {
      return 'Property name already exists';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newPropertyErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    if (!formData.cost.trim() || isNaN(Number(formData.cost)) || Number(formData.cost) < 0) {
      newErrors.cost = 'Valid hourly rate is required';
    }
    if (!formData.variableName.trim()) {
      newErrors.variableName = 'Variable name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.variableName)) {
      newErrors.variableName =
        'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores';
    } else {
      // Check for duplicate variable names
      const existing = labor.find(
        (l) => l.variableName === formData.variableName && l.id !== selectedLaborId
      );
      if (existing) {
        newErrors.variableName = 'Variable name already exists';
      }
    }

    // Validate properties
    for (const prop of properties) {
      const nameError = validatePropertyName(prop.name, prop.id);
      if (nameError) {
        newPropertyErrors[prop.id] = nameError;
      }
    }

    setErrors(newErrors);
    setPropertyErrors(newPropertyErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newPropertyErrors).length === 0;
  };

  const addProperty = () => {
    const nameError = validatePropertyName(newProperty.name);
    if (nameError) {
      setPropertyErrors({ ...propertyErrors, new: nameError });
      return;
    }

    const rawValue = Number(newProperty.value) || 0;
    let storedValue: number | undefined;
    let unitCategory: LaborProperty['unitCategory'];
    
    // If unitSymbol is provided, normalize to base unit
    if (newProperty.unitSymbol) {
      storedValue = normalizeToBase(rawValue, newProperty.unitSymbol);
      unitCategory = getUnitCategory(newProperty.unitSymbol);
    } else {
      storedValue = rawValue; // No unit, treat as unitless
    }

    const property: LaborProperty = {
      id: generateId(),
      name: newProperty.name.trim(),
      type: 'number',
      value: rawValue,
      unitSymbol: newProperty.unitSymbol || undefined,
      unitCategory,
      storedValue,
    };

    setProperties([...properties, property]);
    setNewProperty({ name: '', value: 0, unitSymbol: undefined });
    setPropertyErrors({});
  };

  const updateProperty = (id: string, updates: Partial<LaborProperty>) => {
    setProperties(
      properties.map((p) => {
        if (p.id !== id) return p;
        
        const updated = { ...p, ...updates };
        
        // If updating a number property with unitSymbol, normalize to base
        if (typeof updated.value === 'number') {
          if (updated.unitSymbol) {
            updated.storedValue = normalizeToBase(updated.value, updated.unitSymbol);
            updated.unitCategory = getUnitCategory(updated.unitSymbol);
          } else if (updated.storedValue === undefined) {
            updated.storedValue = updated.value;
          }
        }
        
        // Auto-infer unitCategory from unitSymbol if not set
        if (updated.unitSymbol && !updated.unitCategory) {
          updated.unitCategory = getUnitCategory(updated.unitSymbol);
        }
        
        return updated;
      })
    );
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const quickAddProperty = (name: string) => {
    setNewProperty({ ...newProperty, name });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const laborData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      cost: Number(formData.cost),
      variableName: formData.variableName.trim(),
      description: formData.description.trim() || undefined,
      properties: properties.length > 0 ? properties : undefined,
    };

    if (selectedLaborId) {
      updateLabor(selectedLaborId, laborData);
    } else {
      addLabor(laborData);
    }

    closeEditor();
  };

  const toggleLaborCollapse = (id: string) => {
    setCollapsedLabor((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReorderLabor = (oldIndex: number, newIndex: number) => {
    // Only allow reorder when unfiltered/unsearched to avoid ambiguous ordering
    const canReorder = !searchQuery.trim() && categoryFilter === 'all';
    if (!canReorder) return;

    const ordered = [...sortedByOrder];
    const [moved] = ordered.splice(oldIndex, 1);
    if (!moved) return;
    ordered.splice(newIndex, 0, moved);

    ordered.forEach((item, idx) => {
      if (item.order !== idx) {
        updateLabor(item.id, { order: idx });
      }
    });
  };

  const isCreating = selectedLaborId === null;

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-md-primary mb-2 tracking-tight">Labor Catalog</h1>
          <p className="text-lg text-md-on-surface-variant">Manage labor rates and productivity rates for use in calculation formulas</p>
        </div>
        <Button onClick={() => openEditor()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Labor
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-6 pb-24 ${isEditorOpen ? 'lg:grid-cols-5' : 'lg:grid-cols-1'}`}>
        {/* LEFT SIDE - LABOR CATALOG */}
        <div className={isEditorOpen ? 'lg:col-span-3 space-y-5' : 'lg:col-span-1 space-y-5'}>
          {/* Search and Filter Card */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none" />
                <Input
                  placeholder=""
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="mt-3">
              <CategoryChipSelector
                label="Categories"
                availableCategories={categories.filter(cat => cat.toLowerCase() !== 'custom')}
                selectedCategory={categoryFilter === 'all' ? null : categoryFilter}
                onSelectCategory={(cat) => setCategoryFilter(cat || 'all')}
                allowDeselect
              />
            </div>
          </Card>

          {/* Empty State */}
          {filteredLabor.length === 0 ? (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-md-surface-variant elevation-1 mb-5">
                  <Users className="h-10 w-10 text-md-on-surface-variant" />
                </div>
                <h3 className="text-lg font-bold text-md-primary mb-2 tracking-tight">
                  {labor.length === 0 ? 'No Labor Items Yet' : 'No Labor Items Found'}
                </h3>
                <p className="text-base text-md-on-surface-variant max-w-md mx-auto leading-relaxed mb-5">
                  {labor.length === 0
                    ? 'Add your first labor item to start building your catalog.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {labor.length === 0 && (
                  <Button onClick={() => openEditor()} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Labor Item
                  </Button>
                )}
              </div>
            </Card>
          ) : canReorder ? (
            <SortableList
              items={filteredLabor}
              onReorder={handleReorderLabor}
              className="flex flex-col gap-4"
              renderItem={(laborItem) => (
                <LaborItem
                  key={laborItem.id}
                  labor={laborItem}
                  isCollapsed={collapsedLabor.has(laborItem.id)}
                  onToggleCollapse={toggleLaborCollapse}
                  onEdit={openEditor}
                  onDelete={(id) => {
                    deleteLabor(id);
                    setCollapsedLabor((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    });
                    if (selectedLaborId === id) {
                      closeEditor();
                    }
                  }}
                />
              )}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {filteredLabor.map((laborItem) => (
                <LaborItem
                  key={laborItem.id}
                  labor={laborItem}
                  isCollapsed={collapsedLabor.has(laborItem.id)}
                  onToggleCollapse={toggleLaborCollapse}
                  onEdit={openEditor}
                  onDelete={(id) => {
                    deleteLabor(id);
                    setCollapsedLabor((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    });
                    if (selectedLaborId === id) {
                      closeEditor();
                    }
                  }}
                  disableDrag
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - LABOR EDITOR SIDEBAR */}
        {isEditorOpen && (
          <div className="lg:col-span-2">
            <Card className="sticky top-[88px] z-40" title={isCreating ? 'Create Labor' : 'Edit Labor'}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Labor Name"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const inferredVarName = labelToVariableName(newName);
                    setFormData({ 
                      ...formData, 
                      name: newName,
                      variableName: inferredVarName
                    });
                  }}
                  error={errors.name}
                  required
                  placeholder=""
                />

                <Input
                  label="Variable Name"
                  value={formData.variableName}
                  onChange={(e) => setFormData({ ...formData, variableName: e.target.value })}
                  error={errors.variableName}
                  required
                  placeholder=""
                />
                <p className="text-xs text-md-on-surface-variant -mt-2">
                  Used in formulas. Must start with a letter or underscore.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    error={errors.category}
                    required
                    placeholder=""
                  />
                  <Input
                    label="Hourly Rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    error={errors.cost}
                    required
                    placeholder=""
                  />
                </div>

                <Textarea
                  label="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder=""
                />

                {/* Properties Section */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-md font-semibold text-md-primary">Properties</label>
                    <span className="text-xs text-md-on-surface-variant">
                      {properties.length} {properties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <p className="text-xs text-md-on-surface-variant mb-4">
                    Add productivity rates (e.g., m²/hr, pcs/hr) that can be referenced in formulas using dot notation (e.g., <code className="text-md-primary">labor.m2_per_hr</code>).
                  </p>

                  {/* Quick Add Common Properties */}
                  <div className="mb-4">
                    <p className="text-xs text-md-on-surface-variant mb-2">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_LABOR_PROPERTIES.map((propName) => {
                        const exists = properties.some(
                          (p) => p.name.toLowerCase() === propName.toLowerCase()
                        );

                        return (
                          <Chip
                            key={propName}
                            size="sm"
                            variant={exists ? "ghost" : "primaryTonal"}
                            disabled={exists}
                            onClick={() => !exists && quickAddProperty(propName)}
                          >
                            {propName}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>

                  {/* Properties List */}
                  {properties.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {properties.map((prop) => (
                        <div
                          key={prop.id}
                          className="flex items-start gap-2 p-3 bg-md-surface-variant/70 dark:bg-md-surface-variant/50 rounded-2xl"
                        >
                          <div className="flex-1 min-w-0">
                            {editingPropertyId === prop.id ? (
                              <LaborPropertyForm
                                property={prop}
                                propertyData={{
                                  name: prop.name,
                                  value: prop.value,
                                  unitSymbol: prop.unitSymbol,
                                }}
                                error={propertyErrors[prop.id]}
                                onChange={(updates) => {
                                  // Handle unit conversion for number types
                                  if (typeof updates.value === 'number') {
                                    const unitSymbol = updates.unitSymbol !== undefined ? updates.unitSymbol : prop.unitSymbol;
                                    const finalValue = updates.value !== undefined ? updates.value : prop.value;
                                    const finalUpdates: Partial<LaborProperty> = { ...updates };

                                    if (unitSymbol) {
                                      finalUpdates.storedValue = normalizeToBase(finalValue, unitSymbol);
                                      finalUpdates.unitCategory = getUnitCategory(unitSymbol);
                                    } else {
                                      finalUpdates.storedValue = finalValue;
                                    }

                                    // If unitSymbol changed, also update it
                                    if (updates.unitSymbol !== undefined) {
                                      finalUpdates.unitSymbol = updates.unitSymbol;
                                      if (updates.unitSymbol) {
                                        finalUpdates.unitCategory = getUnitCategory(updates.unitSymbol);
                                      }
                                    }

                                    updateProperty(prop.id, finalUpdates);
                                  } else {
                                    // When value isn't being updated
                                    const finalUpdates: Partial<LaborProperty> = { ...updates };
                                    if (updates.unitSymbol !== undefined) {
                                      finalUpdates.unitSymbol = updates.unitSymbol;
                                      if (updates.unitSymbol) {
                                        finalUpdates.unitCategory = getUnitCategory(updates.unitSymbol);
                                      }
                                    }
                                    updateProperty(prop.id, finalUpdates);
                                  }
                                }}
                                onSubmit={() => setEditingPropertyId(null)}
                                onCancel={() => setEditingPropertyId(null)}
                                mode="edit"
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Chip size="sm" variant="primary">
                                      {prop.name}
                                    </Chip>
                                    {prop.unitSymbol && (
                                      <span className="text-xs text-md-on-surface-variant">({prop.unitSymbol})</span>
                                    )}
                                    {prop.unitCategory && (
                                      <span className="text-xs text-md-on-surface-variant ml-1">[{prop.unitCategory}]</span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-md-on-surface">
                                    {prop.unitSymbol && prop.storedValue !== undefined
                                      ? `${convertFromBase(prop.storedValue, prop.unitSymbol)} ${prop.unitSymbol}`
                                      : String(prop.value)}
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPropertyId(prop.id)}
                                    className="p-2 text-md-on-surface-variant hover:text-md-primary hover:bg-md-surface-variant rounded-full transition-smooth active:scale-95 z-10"
                                    aria-label="Edit property"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeProperty(prop.id)}
                                    className="p-2 text-md-on-surface-variant hover:text-destructive hover:bg-md-surface-variant rounded-full transition-smooth active:scale-95 z-10"
                                    aria-label="Remove property"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Property Form */}
                  <div className="space-y-4">
                    <LaborPropertyForm
                      property={null}
                      propertyData={{
                        name: newProperty.name,
                        value: newProperty.value,
                        unitSymbol: newProperty.unitSymbol,
                      }}
                      error={propertyErrors.new}
                      onChange={(updates) => {
                        const updatedProperty = { ...newProperty };
                        if (updates.name !== undefined) {
                          updatedProperty.name = updates.name;
                          setPropertyErrors({});
                        }
                        if (updates.value !== undefined) {
                          updatedProperty.value = updates.value;
                        }
                        if (updates.unitSymbol !== undefined) {
                          updatedProperty.unitSymbol = updates.unitSymbol;
                        }
                        setNewProperty(updatedProperty);
                      }}
                      onSubmit={addProperty}
                      mode="create"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-border">
                  <Button type="button" variant="ghost" onClick={closeEditor} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {isCreating ? 'Create' : 'Update'} Labor
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

