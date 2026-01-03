'use client';

import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Chip } from '@/components/ui/Chip';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Material, MaterialProperty, MaterialPropertyType, COMMON_MATERIAL_PROPERTIES } from '@/lib/types';
import { labelToVariableName, generateId } from '@/lib/utils';
import { getAllUnitSymbols, getUnitCategory, normalizeToBase, convertFromBase } from '@/lib/units';
import { Plus, Edit2, Trash2, X, Search, Package } from 'lucide-react';
import { PropertyForm } from '@/components/materials/PropertyForm';
import { SortableList } from '@/components/shared/SortableList';
import { MaterialItem } from '@/components/materials/MaterialItem';
import { CategoryChipSelector } from '@/components/shared/CategoryChipSelector';

/**
 * Materials Manager Page
 * 
 * Enterprise-grade materials catalog with split workspace:
 * - Left: Materials catalog with search and filtering
 * - Right: Material editor sidebar (create/edit)
 * 
 * Materials are structured assets used in formula calculations.
 * Variable names are critical - they're referenced in calculation formulas.
 */
export default function MaterialsPage() {
  const materials = useMaterialsStore((state) => state.materials);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const updateMaterial = useMaterialsStore((state) => state.updateMaterial);
  const deleteMaterial = useMaterialsStore((state) => state.deleteMaterial);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    price: '',
    variableName: '',
    sku: '',
    supplier: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<MaterialProperty[]>([]);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<{
    name: string;
    type: MaterialPropertyType;
    value: string;
    unit: string;
    unitSymbol?: string;
  }>({
    name: '',
    type: 'number',
    value: '',
    unit: '',
    unitSymbol: undefined,
  });
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [collapsedMaterials, setCollapsedMaterials] = useState<Set<string>>(
    () => new Set(materials.map((m) => m.id))
  );

  // Keep new materials collapsed by default while preserving user toggles
  useEffect(() => {
    setCollapsedMaterials((prev) => {
      const next = new Set(prev);
      materials.forEach((mat) => {
        if (!next.has(mat.id)) {
          next.add(mat.id);
        }
      });
      return next;
    });
  }, [materials]);

  // Get all unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.category))).sort();
  }, [materials]);

  const sortedByOrder = useMemo(() => {
    return [...materials].sort((a, b) => {
      const orderA = a.order ?? materials.indexOf(a);
      const orderB = b.order ?? materials.indexOf(b);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [materials]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    let filtered = sortedByOrder;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.variableName.toLowerCase().includes(query) ||
          m.sku?.toLowerCase().includes(query) ||
          m.supplier?.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [sortedByOrder, categoryFilter, searchQuery]);

  const canReorder = !searchQuery.trim() && categoryFilter === 'all';

  const openEditor = (material?: Material) => {
    if (material) {
      setSelectedMaterialId(material.id);
      setFormData({
        name: material.name,
        category: material.category,
        unit: material.unit,
        price: material.price.toString(),
        variableName: material.variableName,
        sku: material.sku || '',
        supplier: material.supplier || '',
        description: material.description || '',
      });
      setProperties(material.properties ? [...material.properties] : []);
    } else {
      setSelectedMaterialId(null);
      setFormData({
        name: '',
        category: '',
        unit: '',
        price: '',
        variableName: '',
        sku: '',
        supplier: '',
        description: '',
      });
      setProperties([]);
    }
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty({ name: '', type: 'number', value: '', unit: '', unitSymbol: undefined });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedMaterialId(null);
    setFormData({
      name: '',
      category: '',
      unit: '',
      price: '',
      variableName: '',
      sku: '',
      supplier: '',
      description: '',
    });
    setProperties([]);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty({ name: '', type: 'number', value: '', unit: '', unitSymbol: undefined });
  };

  const validatePropertyName = (name: string, excludeId?: string): string | null => {
    if (!name.trim()) {
      return 'Property name is required';
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return 'Property name must start with a letter or underscore and contain only letters, numbers, and underscores';
    }
    // Check for duplicate property names within the same material
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
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.variableName.trim()) {
      newErrors.variableName = 'Variable name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.variableName)) {
      newErrors.variableName =
        'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores';
    } else {
      // Check for duplicate variable names
      const existing = materials.find(
        (m) => m.variableName === formData.variableName && m.id !== selectedMaterialId
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

    let value: number | string | boolean;
    let storedValue: number | undefined;
    let unitCategory: MaterialProperty['unitCategory'];
    
    if (newProperty.type === 'number' || newProperty.type === 'price') {
      const rawValue = Number(newProperty.value) || 0;
      value = rawValue;
      
      // If unitSymbol is provided, normalize to base unit
      if (newProperty.unitSymbol) {
        storedValue = normalizeToBase(rawValue, newProperty.unitSymbol);
        unitCategory = getUnitCategory(newProperty.unitSymbol);
      } else {
        storedValue = rawValue; // No unit, treat as unitless
      }
    } else if (newProperty.type === 'boolean') {
      value = newProperty.value === 'true' || newProperty.value === '1';
    } else {
      value = newProperty.value;
    }

    const property: MaterialProperty = {
      id: generateId(),
      name: newProperty.name.trim(),
      type: newProperty.type,
      value,
      unit: newProperty.unit.trim() || undefined,
      unitSymbol: newProperty.unitSymbol || undefined,
      unitCategory,
      storedValue: newProperty.type === 'number' ? storedValue : undefined,
    };

    setProperties([...properties, property]);
    setNewProperty({ name: '', type: 'number', value: '', unit: '', unitSymbol: undefined });
    setPropertyErrors({});
  };

  const updateProperty = (id: string, updates: Partial<MaterialProperty>) => {
    setProperties(
      properties.map((p) => {
        if (p.id !== id) return p;
        
        const updated = { ...p, ...updates };
        
        // If updating a number property with unitSymbol, normalize to base
        if ((updated.type === 'number' || updated.type === 'price') && typeof updated.value === 'number') {
          if (updated.unitSymbol) {
            updated.storedValue = normalizeToBase(updated.value, updated.unitSymbol);
            updated.unitCategory = getUnitCategory(updated.unitSymbol);
          } else if (updated.storedValue === undefined) {
            // Migration: if no storedValue, use value as-is
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
    // Don't close the editor here - let the user explicitly click "Done" or "Cancel"
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

    const materialData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      unit: formData.unit.trim(),
      price: Number(formData.price),
      variableName: formData.variableName.trim(),
      sku: formData.sku.trim() || undefined,
      supplier: formData.supplier.trim() || undefined,
      description: formData.description.trim() || undefined,
      properties: properties.length > 0 ? properties : undefined,
    };

    if (selectedMaterialId) {
      updateMaterial(selectedMaterialId, materialData);
    } else {
      addMaterial(materialData);
    }

    closeEditor();
  };

  const toggleMaterialCollapse = (id: string) => {
    setCollapsedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReorderMaterials = (oldIndex: number, newIndex: number) => {
    // Only allow reorder when unfiltered/unsearched to avoid ambiguous ordering
    const canReorder = !searchQuery.trim() && categoryFilter === 'all';
    if (!canReorder) return;

    const ordered = [...sortedByOrder];
    const [moved] = ordered.splice(oldIndex, 1);
    if (!moved) return;
    ordered.splice(newIndex, 0, moved);

    ordered.forEach((mat, idx) => {
      if (mat.order !== idx) {
        updateMaterial(mat.id, { order: idx });
      }
    });
  };

  const isCreating = selectedMaterialId === null;

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-md-primary mb-2 tracking-tight">Materials Catalog</h1>
          <p className="text-lg text-md-on-surface-variant">Manage materials and their prices for use in calculation formulas</p>
        </div>
        <Button onClick={() => openEditor()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-6 pb-24 ${isEditorOpen ? 'lg:grid-cols-5' : 'lg:grid-cols-1'}`}>
        {/* LEFT SIDE - MATERIALS CATALOG */}
        <div className={isEditorOpen ? 'lg:col-span-3 space-y-5' : 'lg:col-span-1 space-y-5'}>
          {/* Search and Filter Card */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="mt-3">
              <CategoryChipSelector
                label="Categories"
                availableCategories={categories}
                selectedCategory={categoryFilter === 'all' ? null : categoryFilter}
                onSelectCategory={(cat) => setCategoryFilter(cat || 'all')}
                allowDeselect
              />
            </div>
          </Card>

          {/* Empty State */}
          {filteredMaterials.length === 0 ? (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-md-surface-variant elevation-1 mb-5">
                  <Package className="h-10 w-10 text-md-on-surface-variant" />
                </div>
                <h3 className="text-lg font-bold text-md-primary mb-2 tracking-tight">
                  {materials.length === 0 ? 'No Materials Yet' : 'No Materials Found'}
                </h3>
                <p className="text-base text-md-on-surface-variant max-w-md mx-auto leading-relaxed mb-5">
                  {materials.length === 0
                    ? 'Add your first material to start building your catalog.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
                {materials.length === 0 && (
                  <Button onClick={() => openEditor()} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Material
                  </Button>
                )}
              </div>
            </Card>
          ) : canReorder ? (
            <SortableList
              items={filteredMaterials}
              onReorder={handleReorderMaterials}
              className="flex flex-col gap-4"
              renderItem={(material) => (
                <MaterialItem
                  key={material.id}
                  material={material}
                  isCollapsed={collapsedMaterials.has(material.id)}
                  onToggleCollapse={toggleMaterialCollapse}
                  onEdit={openEditor}
                  onDelete={(id) => {
                    if (confirm(`Are you sure you want to delete "${material.name}"?`)) {
                      deleteMaterial(id);
                      setCollapsedMaterials((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                      if (selectedMaterialId === id) {
                        closeEditor();
                      }
                    }
                  }}
                />
              )}
            />
          ) : (
                <div className="flex flex-col gap-4">
              {filteredMaterials.map((material) => (
                <MaterialItem
                  key={material.id}
                  material={material}
                  isCollapsed={collapsedMaterials.has(material.id)}
                  onToggleCollapse={toggleMaterialCollapse}
                  onEdit={openEditor}
                  onDelete={(id) => {
                    if (confirm(`Are you sure you want to delete "${material.name}"?`)) {
                      deleteMaterial(id);
                      setCollapsedMaterials((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                      if (selectedMaterialId === id) {
                        closeEditor();
                      }
                    }
                  }}
                  disableDrag
                />
              ))}
                </div>
          )}
        </div>

        {/* RIGHT SIDE - MATERIAL EDITOR SIDEBAR */}
        {isEditorOpen && (
          <div className="lg:col-span-2">
            <Card title={isCreating ? 'Create Material' : 'Edit Material'} className="sticky top-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Material Name"
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
                  placeholder="e.g., Premium Hardwood Lumber"
                />

                <Input
                  label="Variable Name"
                  value={formData.variableName}
                  onChange={(e) => setFormData({ ...formData, variableName: e.target.value })}
                  error={errors.variableName}
                  required
                  placeholder="e.g., lumber_price"
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
                    placeholder="e.g., Lumber"
                  />
                  <Input
                    label="Unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    error={errors.unit}
                    required
                    placeholder="e.g., sq ft"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Unit Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    error={errors.price}
                    required
                    placeholder="0.00"
                  />
                  <Input
                    label="SKU (optional)"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., LUM-001"
                  />
                </div>

                <Input
                  label="Supplier (optional)"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="e.g., ABC Supply Co."
                />

                <Textarea
                  label="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Material description, usage notes, or specifications..."
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
                    Add material properties (dimensions, density, etc.) that can be referenced in formulas using dot notation (e.g., <code className="text-md-primary">mdf_sheet_width</code>).
                  </p>

                  {/* Quick Add Common Properties */}
                  <div className="mb-4">
                    <p className="text-xs text-md-on-surface-variant mb-2">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MATERIAL_PROPERTIES.map((propName) => {
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
                              <PropertyForm
                                property={prop}
                                propertyData={{
                                  name: prop.name,
                                  type: prop.type,
                                  value: prop.value,
                                  unitSymbol: prop.unitSymbol,
                                }}
                                error={propertyErrors[prop.id]}
                                onChange={(updates) => {
                                  // Handle unit conversion for number/price types
                                  if ((prop.type === 'number' || prop.type === 'price') && typeof updates.value === 'number') {
                                    const unitSymbol = updates.unitSymbol !== undefined ? updates.unitSymbol : prop.unitSymbol;
                                    const finalValue = updates.value !== undefined ? updates.value : prop.value as number;
                                    const finalUpdates: Partial<MaterialProperty> = { ...updates };

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
                                    // For non-number types or when value isn't being updated
                                    const finalUpdates: Partial<MaterialProperty> = { ...updates };
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
                                      <Chip size="sm" variant="default">
                                      {prop.type}
                                      </Chip>
                                    {prop.unitSymbol && (
                                      <span className="text-xs text-md-on-surface-variant">({prop.unitSymbol})</span>
                                    )}
                                    {prop.unitCategory && (
                                      <span className="text-xs text-md-on-surface-variant ml-1">[{prop.unitCategory}]</span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-md-on-surface">
                                    {prop.type === 'boolean'
                                      ? prop.value === true || prop.value === 'true'
                                        ? 'True'
                                        : 'False'
                                      : prop.type === 'number' && prop.unitSymbol && prop.storedValue !== undefined
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
                    <PropertyForm
                      property={null}
                      propertyData={{
                        name: newProperty.name,
                        type: newProperty.type,
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
                        if (updates.type !== undefined) {
                          updatedProperty.type = updates.type;
                        }
                        if (updates.value !== undefined) {
                          // Convert to string for newProperty state
                          updatedProperty.value = String(updates.value);
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
                    {isCreating ? 'Create' : 'Update'} Material
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
