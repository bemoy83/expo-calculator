'use client';

import { useEffect, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LaborPropertyForm } from '@/components/labor/LaborPropertyForm';
import { applyNumericPropertyNormalization, normalizeNumericProperty } from '@/components/shared/catalog/catalog-units';
import {
  validateDuplicateVariableName,
  validatePropertyName,
  validateVariableIdentifier,
} from '@/components/shared/catalog/catalog-validation';
import { COMMON_LABOR_PROPERTIES, Labor, LaborProperty } from '@/lib/types';
import { convertFromBase, getUnitCategory } from '@/lib/units';
import { generateId, labelToVariableName } from '@/lib/utils';

type LaborFormData = {
  name: string;
  category: string;
  cost: string;
  variableName: string;
  description: string;
};

type NewLaborProperty = {
  name: string;
  value: number;
  unitSymbol?: string;
};

interface LaborEditorPanelProps {
  laborItem: Labor | null;
  labor: Labor[];
  onSave: (id: string | null, data: Omit<Partial<Labor>, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const emptyFormData: LaborFormData = {
  name: '',
  category: '',
  cost: '',
  variableName: '',
  description: '',
};

const emptyNewProperty: NewLaborProperty = {
  name: '',
  value: 0,
  unitSymbol: undefined,
};

function toFormData(laborItem: Labor | null): LaborFormData {
  if (!laborItem) return emptyFormData;

  return {
    name: laborItem.name,
    category: laborItem.category,
    cost: laborItem.cost.toString(),
    variableName: laborItem.variableName,
    description: laborItem.description || '',
  };
}

function displayLaborPropertyValue(prop: LaborProperty) {
  if (prop.unitSymbol && prop.storedValue !== undefined) {
    return `${convertFromBase(prop.storedValue, prop.unitSymbol)} ${prop.unitSymbol}`;
  }
  return String(prop.value);
}

export function LaborEditorPanel({
  laborItem,
  labor,
  onSave,
  onClose,
}: LaborEditorPanelProps) {
  const [formData, setFormData] = useState<LaborFormData>(() => toFormData(laborItem));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [properties, setProperties] = useState<LaborProperty[]>(() =>
    laborItem?.properties ? [...laborItem.properties] : []
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<NewLaborProperty>(emptyNewProperty);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(toFormData(laborItem));
    setProperties(laborItem?.properties ? [...laborItem.properties] : []);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty(emptyNewProperty);
  }, [laborItem]);

  const selectedLaborId = laborItem?.id ?? null;
  const isCreating = selectedLaborId === null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newPropertyErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.cost.trim() || isNaN(Number(formData.cost)) || Number(formData.cost) < 0) {
      newErrors.cost = 'Valid hourly rate is required';
    }

    const variableError = validateVariableIdentifier(formData.variableName);
    const duplicateError = validateDuplicateVariableName(labor, formData.variableName, selectedLaborId);
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

    const rawValue = Number(newProperty.value) || 0;
    const property: LaborProperty = {
      id: generateId(),
      name: newProperty.name.trim(),
      type: 'number',
      value: rawValue,
      unitSymbol: newProperty.unitSymbol || undefined,
      ...normalizeNumericProperty(rawValue, newProperty.unitSymbol),
    };

    setProperties([...properties, property]);
    setNewProperty(emptyNewProperty);
    setPropertyErrors({});
  };

  const updateProperty = (id: string, updates: Partial<LaborProperty>) => {
    setProperties(
      properties.map((property) => {
        if (property.id !== id) return property;
        const updated = { ...property, ...updates };

        if (typeof updated.value === 'number') {
          return applyNumericPropertyNormalization(updated) as LaborProperty;
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

    onSave(selectedLaborId, {
      name: formData.name.trim(),
      category: formData.category.trim(),
      cost: Number(formData.cost),
      variableName: formData.variableName.trim(),
      description: formData.description.trim() || undefined,
      properties: properties.length > 0 ? properties : undefined,
    });
  };

  return (
    <div className="lg:col-span-2">
      <Card className="sticky top-[88px] z-40" title={isCreating ? 'Create Labor' : 'Edit Labor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Labor Name"
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
              label="Hourly Rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(event) => setFormData({ ...formData, cost: event.target.value })}
              error={errors.cost}
              required
              placeholder=""
            />
          </div>

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
              Add productivity rates (e.g., m²/hr, pcs/hr) that can be referenced in formulas using dot notation (e.g., <code className="text-md-primary">labor.m2_per_hr</code>).
            </p>

            <div className="mb-4">
              <p className="text-xs text-md-on-surface-variant mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_LABOR_PROPERTIES.map((propName) => {
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
                        <LaborPropertyForm
                          property={prop}
                          propertyData={{
                            name: prop.name,
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
                              {prop.unitSymbol && (
                                <span className="text-xs text-md-on-surface-variant">({prop.unitSymbol})</span>
                              )}
                              {prop.unitCategory && (
                                <span className="text-xs text-md-on-surface-variant ml-1">[{prop.unitCategory}]</span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-md-on-surface">
                              {displayLaborPropertyValue(prop)}
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
                  if (updates.value !== undefined) updatedProperty.value = updates.value;
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
              {isCreating ? 'Create' : 'Update'} Labor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
