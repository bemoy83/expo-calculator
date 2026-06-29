'use client';

import { useEffect, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PropertyForm } from '@/components/materials/PropertyForm';
import { applyNumericPropertyNormalization, normalizeNumericProperty } from '@/components/shared/catalog/catalog-units';
import {
  validateDuplicateVariableName,
  validatePropertyName,
  validateVariableIdentifier,
} from '@/components/shared/catalog/catalog-validation';
import { COMMON_MATERIAL_PROPERTIES, Material, MaterialProperty, MaterialPropertyType } from '@/lib/types';
import { convertFromBase, getUnitCategory } from '@/lib/units';
import { generateId, labelToVariableName } from '@/lib/utils';

type MaterialFormData = {
  name: string;
  category: string;
  unit: string;
  price: string;
  variableName: string;
  sku: string;
  supplier: string;
  description: string;
};

type NewMaterialProperty = {
  name: string;
  type: MaterialPropertyType;
  value: string;
  unit: string;
  unitSymbol?: string;
};

interface MaterialEditorPanelProps {
  material: Material | null;
  materials: Material[];
  onSave: (id: string | null, data: Omit<Partial<Material>, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const emptyFormData: MaterialFormData = {
  name: '',
  category: '',
  unit: '',
  price: '',
  variableName: '',
  sku: '',
  supplier: '',
  description: '',
};

const emptyNewProperty: NewMaterialProperty = {
  name: '',
  type: 'number',
  value: '',
  unit: '',
  unitSymbol: undefined,
};

function toFormData(material: Material | null): MaterialFormData {
  if (!material) return emptyFormData;

  return {
    name: material.name,
    category: material.category,
    unit: material.unit,
    price: material.price.toString(),
    variableName: material.variableName,
    sku: material.sku || '',
    supplier: material.supplier || '',
    description: material.description || '',
  };
}

function displayMaterialPropertyValue(prop: MaterialProperty) {
  if (prop.type === 'boolean') {
    return prop.value === true || prop.value === 'true' ? 'True' : 'False';
  }
  if (prop.type === 'number' && prop.unitSymbol && prop.storedValue !== undefined) {
    return `${convertFromBase(prop.storedValue, prop.unitSymbol)} ${prop.unitSymbol}`;
  }
  return String(prop.value);
}

export function MaterialEditorPanel({
  material,
  materials,
  onSave,
  onClose,
}: MaterialEditorPanelProps) {
  const [formData, setFormData] = useState<MaterialFormData>(() => toFormData(material));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<MaterialProperty[]>(() =>
    material?.properties ? [...material.properties] : []
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<NewMaterialProperty>(emptyNewProperty);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(toFormData(material));
    setProperties(material?.properties ? [...material.properties] : []);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty(emptyNewProperty);
  }, [material]);

  const selectedMaterialId = material?.id ?? null;
  const isCreating = selectedMaterialId === null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newPropertyErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    const variableError = validateVariableIdentifier(formData.variableName);
    const duplicateError = validateDuplicateVariableName(materials, formData.variableName, selectedMaterialId);
    if (variableError) {
      newErrors.variableName = variableError;
    } else if (duplicateError) {
      newErrors.variableName = duplicateError;
    }

    for (const prop of properties) {
      const nameError = validatePropertyName(properties, prop.name, prop.id);
      if (nameError) {
        newPropertyErrors[prop.id] = nameError;
      }
    }

    setErrors(newErrors);
    setPropertyErrors(newPropertyErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newPropertyErrors).length === 0;
  };

  const addProperty = () => {
    const nameError = validatePropertyName(properties, newProperty.name);
    if (nameError) {
      setPropertyErrors({ ...propertyErrors, new: nameError });
      return;
    }

    let value: number | string | boolean;
    let normalized: Pick<MaterialProperty, 'storedValue' | 'unitCategory'> = {};

    if (newProperty.type === 'number' || newProperty.type === 'price') {
      const rawValue = Number(newProperty.value) || 0;
      value = rawValue;
      normalized = normalizeNumericProperty(rawValue, newProperty.unitSymbol);
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
      ...normalized,
    };

    setProperties([...properties, property]);
    setNewProperty(emptyNewProperty);
    setPropertyErrors({});
  };

  const updateProperty = (id: string, updates: Partial<MaterialProperty>) => {
    setProperties(
      properties.map((property) => {
        if (property.id !== id) return property;
        const updated = { ...property, ...updates };

        if ((updated.type === 'number' || updated.type === 'price') && typeof updated.value === 'number') {
          return applyNumericPropertyNormalization(updated) as MaterialProperty;
        }

        if (updated.unitSymbol && !updated.unitCategory) {
          updated.unitCategory = getUnitCategory(updated.unitSymbol);
        }

        return updated;
      })
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    onSave(selectedMaterialId, {
      name: formData.name.trim(),
      category: formData.category.trim(),
      unit: formData.unit.trim(),
      price: Number(formData.price),
      variableName: formData.variableName.trim(),
      sku: formData.sku.trim() || undefined,
      supplier: formData.supplier.trim() || undefined,
      description: formData.description.trim() || undefined,
      properties: properties.length > 0 ? properties : undefined,
    });
  };

  return (
    <div className="lg:col-span-2">
      <Card className="sticky top-[88px] z-40" title={isCreating ? 'Create Material' : 'Edit Material'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Material Name"
            value={formData.name}
            onChange={(event) => {
              const name = event.target.value;
              setFormData({ ...formData, name, variableName: labelToVariableName(name) });
            }}
            error={errors.name}
            required
            placeholder=""
          />

          <Input
            label="Variable Name"
            value={formData.variableName}
            onChange={(event) => setFormData({ ...formData, variableName: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              error={errors.category}
              required
              placeholder=""
            />
            <Input
              label="Unit"
              value={formData.unit}
              onChange={(event) => setFormData({ ...formData, unit: event.target.value })}
              error={errors.unit}
              required
              placeholder=""
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(event) => setFormData({ ...formData, price: event.target.value })}
              error={errors.price}
              required
              placeholder=""
            />
            <Input
              label="SKU (optional)"
              value={formData.sku}
              onChange={(event) => setFormData({ ...formData, sku: event.target.value })}
              placeholder=""
            />
          </div>

          <Input
            label="Supplier (optional)"
            value={formData.supplier}
            onChange={(event) => setFormData({ ...formData, supplier: event.target.value })}
            placeholder=""
          />

          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            rows={3}
            placeholder=""
          />

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

            <div className="mb-4">
              <p className="text-xs text-md-on-surface-variant mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_MATERIAL_PROPERTIES.map((propName) => {
                  const exists = properties.some((property) => property.name.toLowerCase() === propName.toLowerCase());
                  return (
                    <Chip
                      key={propName}
                      size="sm"
                      variant={exists ? 'ghost' : 'primaryTonal'}
                      disabled={exists}
                      onClick={() => !exists && setNewProperty({ ...newProperty, name: propName })}
                    >
                      {propName}
                    </Chip>
                  );
                })}
              </div>
            </div>

            {properties.length > 0 && (
              <div className="space-y-2 mb-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="flex items-start gap-2 p-3 bg-md-surface-variant/70 dark:bg-md-surface-variant/50 rounded-2xl">
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
                          onChange={(updates) => updateProperty(prop.id, updates)}
                          onSubmit={() => setEditingPropertyId(null)}
                          onCancel={() => setEditingPropertyId(null)}
                          mode="edit"
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Chip size="sm" variant="primary">{prop.name}</Chip>
                              <Chip size="sm" variant="default">{prop.type}</Chip>
                              {prop.unitSymbol && (
                                <span className="text-xs text-md-on-surface-variant">({prop.unitSymbol})</span>
                              )}
                              {prop.unitCategory && (
                                <span className="text-xs text-md-on-surface-variant ml-1">[{prop.unitCategory}]</span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-md-on-surface">
                              {displayMaterialPropertyValue(prop)}
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
                              onClick={() => setProperties(properties.filter((property) => property.id !== prop.id))}
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
                  if (updates.type !== undefined) updatedProperty.type = updates.type;
                  if (updates.value !== undefined) updatedProperty.value = String(updates.value);
                  if (updates.unitSymbol !== undefined) updatedProperty.unitSymbol = updates.unitSymbol;
                  setNewProperty(updatedProperty);
                }}
                onSubmit={addProperty}
                mode="create"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isCreating ? 'Create' : 'Update'} Material
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
