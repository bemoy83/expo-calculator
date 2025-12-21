'use client';

import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Material } from '@/lib/types';
import { labelToVariableName } from '@/lib/utils';
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
    }
    setErrors({});
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
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Materials Catalog</h1>
        <p className="text-lg text-muted-foreground">Manage materials and their prices for use in calculation formulas</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${isEditorOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {/* LEFT SIDE - MATERIALS CATALOG */}
        <div className={isEditorOpen ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <Card>
            {/* Search and Filter Bar */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input - Dominant, flex-grows to fill space */}
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full rounded-xl"
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
                {/* Add Material Button - Fixed width, no flex-grow */}
                <Button onClick={() => openEditor()} className="w-full sm:w-auto whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>
            </div>

            {/* Materials List */}
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-24">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted shadow-elevated mb-6">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                  {materials.length === 0 ? 'No Materials Yet' : 'No Materials Found'}
                </h3>
                <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
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
            ) : (
              <div className="space-y-3">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="bg-card border border-border rounded-2xl p-6 shadow-elevated hover:shadow-floating hover:border-accent/30 transition-smooth group"
                  >
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
                            <code className="px-2.5 py-1 bg-muted border border-accent/30 rounded-lg text-sm text-accent font-mono">
                              {material.variableName}
                            </code>
                          </div>
                          {material.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-1 shrink-0">
                        <button
                          onClick={() => openEditor(material)}
                          className="p-2 text-muted-foreground hover:text-accent hover:bg-muted rounded-xl transition-colors"
                          aria-label="Edit material"
                        >
                          <Edit2 className="h-4 w-4" />
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
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-xl transition-colors"
                          aria-label="Delete material"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
