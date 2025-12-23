'use client';

import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Material, MaterialProperty, MaterialPropertyType, COMMON_MATERIAL_PROPERTIES } from '@/lib/types';
import { labelToVariableName, generateId } from '@/lib/utils';
import { getAllUnitSymbols, getUnitCategory, normalizeToBase, convertFromBase } from '@/lib/units';
import { Plus, Edit2, Trash2, X, Search, Package } from 'lucide-react';

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

  // Get all unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.category))).sort();
  }, [materials]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    let filtered = materials;

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    // Apply search filter
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

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, categoryFilter, searchQuery]);

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
    
    if (newProperty.type === 'number') {
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
        if (updated.type === 'number' && typeof updated.value === 'number') {
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
    setEditingPropertyId(null);
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

  const isCreating = selectedMaterialId === null;

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Materials Catalog</h1>
          <p className="text-lg text-muted-foreground">Manage materials and their prices for use in calculation formulas</p>
        </div>
        <Button onClick={() => openEditor()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Material
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-6 pb-24 ${isEditorOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* LEFT SIDE - MATERIALS CATALOG */}
        <div className={isEditorOpen ? 'lg:col-span-2 space-y-5' : 'lg:col-span-1 space-y-5'}>
          {/* Search and Filter Card */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input - Dominant, flex-grows to fill space */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              {/* Category Dropdown - Fixed width, no flex-grow */}
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...categories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Empty State */}
          {filteredMaterials.length === 0 ? (
            <Card>
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted shadow-sm mb-5">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">
                  {materials.length === 0 ? 'No Materials Yet' : 'No Materials Found'}
                </h3>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed mb-5">
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
          ) : (
            <>
              {/* Materials List - Each material is its own Card */}
              {filteredMaterials.map((material) => (
                <Card key={material.id} className="overlay-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-card-foreground mb-2">{material.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                              {material.category}
                            </span>
                            {material.sku && (
                              <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                                SKU: {material.sku}
                              </span>
                            )}
                            {material.supplier && (
                              <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                                {material.supplier}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-3xl font-bold text-success tabular-nums tracking-tight">
                            ${material.price.toFixed(2)}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">per {material.unit}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">Variable:</span>
                          <code className="px-2.5 py-1 bg-muted border border-accent/30 rounded-md text-sm text-accent font-mono">
                            {material.variableName}
                          </code>
                        </div>
                        {material.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                        )}
                        {material.properties && material.properties.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">Properties:</span>
                              <span className="text-xs text-muted-foreground">
                                {material.properties.length} {material.properties.length === 1 ? 'property' : 'properties'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {material.properties.map((prop) => (
                                <div
                                  key={prop.id}
                                  className="px-2.5 py-1 bg-muted/50 border border-border rounded-md text-xs"
                                  title={`${prop.name}: ${prop.type === 'boolean' ? (prop.value === true || prop.value === 'true' ? 'True' : 'False') : String(prop.value)}${prop.unit ? ` ${prop.unit}` : ''}`}
                                >
                                  <code className="text-accent font-mono">{material.variableName}.{prop.name}</code>
                                  {prop.unitSymbol && (
                                    <span className="text-muted-foreground ml-1">({prop.unitSymbol})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <button
                        onClick={() => openEditor(material)}
                        className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded-lg transition-colors"
                        aria-label={`Edit material: ${material.name}`}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${material.name}"?`)) {
                            deleteMaterial(material.id);
                            if (selectedMaterialId === material.id) {
                              closeEditor();
                            }
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                        aria-label={`Delete material: ${material.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* RIGHT SIDE - MATERIAL EDITOR SIDEBAR */}
        {isEditorOpen && (
          <div className="lg:col-span-1">
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
                <p className="text-xs text-muted-foreground -mt-2">
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
                    <label className="text-sm font-semibold text-foreground">Properties</label>
                    <span className="text-xs text-muted-foreground">
                      {properties.length} {properties.length === 1 ? 'property' : 'properties'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add material properties (dimensions, density, etc.) that can be referenced in formulas using dot notation (e.g., <code className="text-accent">mat_plank.length</code>).
                  </p>

                  {/* Quick Add Common Properties */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MATERIAL_PROPERTIES.map((propName) => {
                        const exists = properties.some((p) => p.name.toLowerCase() === propName.toLowerCase());
                        return (
                          <button
                            key={propName}
                            type="button"
                            onClick={() => quickAddProperty(propName)}
                            disabled={exists}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-smooth ${
                              exists
                                ? 'border-muted text-muted-foreground cursor-not-allowed opacity-50'
                                : 'border-accent text-accent hover:bg-accent/10'
                            }`}
                          >
                            {propName}
                          </button>
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
                          className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex-1 min-w-0">
                            {editingPropertyId === prop.id ? (
                              <div className="space-y-2">
                                <Input
                                  label="Property Name"
                                  value={prop.name}
                                  onChange={(e) => updateProperty(prop.id, { name: e.target.value })}
                                  error={propertyErrors[prop.id]}
                                  placeholder="e.g., length"
                                  className="text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Select
                                    label="Type"
                                    value={prop.type}
                                    onChange={(e) =>
                                      updateProperty(prop.id, {
                                        type: e.target.value as MaterialPropertyType,
                                        value:
                                          e.target.value === 'number'
                                            ? 0
                                            : e.target.value === 'boolean'
                                            ? false
                                            : '',
                                      })
                                    }
                                    options={[
                                      { value: 'number', label: 'Number' },
                                      { value: 'string', label: 'String' },
                                      { value: 'boolean', label: 'Boolean' },
                                    ]}
                                  />
                                  <Select
                                    label="Unit (optional)"
                                    value={prop.unitSymbol || ''}
                                    onChange={(e) => {
                                      const unitSymbol = e.target.value || undefined;
                                      const unitCategory = unitSymbol ? getUnitCategory(unitSymbol) : undefined;
                                      // If updating unitSymbol, also update storedValue if it's a number property
                                      let updates: Partial<MaterialProperty> = {
                                        unitSymbol,
                                        unitCategory,
                                      };
                                      if (prop.type === 'number' && typeof prop.value === 'number' && unitSymbol) {
                                        updates.storedValue = normalizeToBase(prop.value, unitSymbol);
                                      }
                                      updateProperty(prop.id, updates);
                                    }}
                                    options={[
                                      { value: '', label: 'None (unitless)' },
                                      ...getAllUnitSymbols().map(symbol => ({
                                        value: symbol,
                                        label: `${symbol}${getUnitCategory(symbol) ? ` (${getUnitCategory(symbol)})` : ''}`,
                                      })),
                                    ]}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  {prop.type === 'number' && (
                                    <Input
                                      label="Value"
                                      type="number"
                                      value={
                                        typeof prop.value === 'number'
                                          ? prop.unitSymbol && prop.storedValue !== undefined
                                            ? convertFromBase(prop.storedValue, prop.unitSymbol)
                                            : prop.value
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const rawValue = Number(e.target.value) || 0;
                                        const updates: Partial<MaterialProperty> = { value: rawValue };
                                        if (prop.unitSymbol) {
                                          updates.storedValue = normalizeToBase(rawValue, prop.unitSymbol);
                                        } else {
                                          updates.storedValue = rawValue;
                                        }
                                        updateProperty(prop.id, updates);
                                      }}
                                      className="text-sm"
                                    />
                                  )}
                                  {prop.type === 'boolean' && (
                                    <Select
                                      label="Value"
                                      value={prop.value === true || prop.value === 'true' ? 'true' : 'false'}
                                      onChange={(e) =>
                                        updateProperty(prop.id, { value: e.target.value === 'true' })
                                      }
                                      options={[
                                        { value: 'true', label: 'True' },
                                        { value: 'false', label: 'False' },
                                      ]}
                                    />
                                  )}
                                  {prop.type === 'string' && (
                                    <Input
                                      label="Value"
                                      value={typeof prop.value === 'string' ? prop.value : ''}
                                      onChange={(e) => updateProperty(prop.id, { value: e.target.value })}
                                      className="text-sm"
                                    />
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingPropertyId(null)}
                                    className="flex-1"
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <code className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono text-accent">
                                      {prop.name}
                                    </code>
                                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs capitalize">
                                      {prop.type}
                                    </span>
                                    {prop.unitSymbol && (
                                      <span className="text-xs text-muted-foreground">({prop.unitSymbol})</span>
                                    )}
                                    {prop.unitCategory && (
                                      <span className="text-xs text-muted-foreground ml-1">[{prop.unitCategory}]</span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-foreground">
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
                                    className="p-1.5 text-muted-foreground hover:text-accent hover:bg-muted rounded transition-colors"
                                    aria-label="Edit property"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeProperty(prop.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
                                    aria-label="Remove property"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Input
                        label="Property Name"
                        value={newProperty.name}
                        onChange={(e) => {
                          setNewProperty({ ...newProperty, name: e.target.value });
                          setPropertyErrors({});
                        }}
                        error={propertyErrors.new}
                        placeholder="e.g., length"
                        className="text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Type"
                          value={newProperty.type}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              type: e.target.value as MaterialPropertyType,
                              value: '',
                            })
                          }
                          options={[
                            { value: 'number', label: 'Number' },
                            { value: 'string', label: 'String' },
                            { value: 'boolean', label: 'Boolean' },
                          ]}
                        />
                        <Select
                          label="Unit (optional)"
                          value={newProperty.unitSymbol || ''}
                          onChange={(e) => {
                            const unitSymbol = e.target.value || undefined;
                            setNewProperty({ ...newProperty, unitSymbol });
                          }}
                          options={[
                            { value: '', label: 'None (unitless)' },
                            ...getAllUnitSymbols().map(symbol => ({
                              value: symbol,
                              label: `${symbol}${getUnitCategory(symbol) ? ` (${getUnitCategory(symbol)})` : ''}`,
                            })),
                          ]}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        {newProperty.type === 'number' && (
                          <Input
                            label="Value"
                            type="number"
                            value={newProperty.value}
                            onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                            className="text-sm"
                          />
                        )}
                        {newProperty.type === 'boolean' && (
                          <Select
                            label="Value"
                            value={newProperty.value}
                            onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                            options={[
                              { value: 'true', label: 'True' },
                              { value: 'false', label: 'False' },
                            ]}
                          />
                        )}
                        {newProperty.type === 'string' && (
                          <Input
                            label="Value"
                            value={newProperty.value}
                            onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                            className="text-sm"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addProperty}
                        className="w-full"
                        disabled={!newProperty.name.trim()}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Property
                      </Button>
                    </div>
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
