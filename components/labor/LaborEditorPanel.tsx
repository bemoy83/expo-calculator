'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LaborPropertyForm } from '@/components/labor/LaborPropertyForm';
import {
  CatalogEditorPanel,
  CatalogPropertyRow,
  FormulaReference,
  PanelSectionHeading,
} from '@/components/shared/catalog/CatalogEditorPanel';
import { applyNumericPropertyNormalization, normalizeNumericProperty } from '@/components/shared/catalog/catalog-units';
import {
  validateDuplicateVariableName,
  validatePropertyName,
  validateVariableIdentifier,
} from '@/components/shared/catalog/catalog-validation';
import { useClearErrorsOnChange } from '@/components/shared/catalog/useClearErrorsOnChange';
import { COMMON_LABOR_PROPERTIES, Labor, LaborProperty } from '@/lib/types';
import { formatCatalogPropertyValue } from '@/lib/catalog/catalog-display';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { getUnitCategory } from '@/lib/units';
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
  onDelete?: (id: string) => void;
  /** Calculators that name this labor item in a formula or offer it in a picker. */
  usageCount: number;
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

export function LaborEditorPanel({
  laborItem,
  labor,
  onSave,
  onClose,
  onDelete,
  usageCount,
}: LaborEditorPanelProps) {
  const [formData, setFormData] = useState<LaborFormData>(() => toFormData(laborItem));
  const [errors, setErrors] = useState<Record<string, string>>({});
  useClearErrorsOnChange(formData, setErrors);
  const [properties, setProperties] = useState<LaborProperty[]>(() =>
    laborItem?.properties ? [...laborItem.properties] : []
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<NewLaborProperty>(emptyNewProperty);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [isAddingProperty, setIsAddingProperty] = useState(false);

  useEffect(() => {
    setFormData(toFormData(laborItem));
    setProperties(laborItem?.properties ? [...laborItem.properties] : []);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty(emptyNewProperty);
    setIsAddingProperty(false);
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
    setIsAddingProperty(false);
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

  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const variableName = formData.variableName.trim();

  return (
    <CatalogEditorPanel
      title={isCreating ? 'New labor' : 'Edit labor'}
      subtitle={isCreating ? undefined : `used in ${usageCount} ${usageCount === 1 ? 'calculator' : 'calculators'}`}
      submitLabel={isCreating ? 'Create' : 'Save'}
      onSubmit={handleSubmit}
      onClose={onClose}
      onDelete={laborItem && onDelete ? () => onDelete(laborItem.id) : undefined}
      deleteName={laborItem?.name}
    >
      <Input
        label="Name"
        value={formData.name}
        onChange={(event) => {
          const name = event.target.value;
          setFormData({ ...formData, name, variableName: labelToVariableName(name) });
        }}
        error={errors.name}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Category"
          value={formData.category}
          onChange={(event) => setFormData({ ...formData, category: event.target.value })}
          error={errors.category}
          required
        />
        <Input
          label="Variable"
          value={formData.variableName}
          onChange={(event) => setFormData({ ...formData, variableName: event.target.value })}
          error={errors.variableName}
          required
          className="font-numeric"
        />
      </div>

      <Input
        label="Hourly rate"
        type="number"
        step="0.01"
        min="0"
        value={formData.cost}
        onChange={(event) => setFormData({ ...formData, cost: event.target.value })}
        error={errors.cost}
        required
        className="font-numeric"
      />

      <FormulaReference
        variableName={variableName}
        value={`${formatCurrency(Number(formData.cost) || 0)} / hr`}
      />

      <div>
        <PanelSectionHeading
          aside={
            !isAddingProperty && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingProperty(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add property
              </Button>
            )
          }
        >
          Properties
        </PanelSectionHeading>

        {properties.length === 0 && !isAddingProperty && (
          <p className="mt-1 text-xs text-draft">
            No properties. Calculators that read a productivity rate (e.g. <code className="font-numeric">{variableName || 'name'}.m2_per_hr</code>) can&apos;t calculate.
          </p>
        )}

        <div className="mt-1">
          {properties.map((prop) =>
            editingPropertyId === prop.id ? (
              <div key={prop.id} className="my-2 p-3 rounded-md border border-border">
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
              </div>
            ) : (
              <CatalogPropertyRow
                key={prop.id}
                name={prop.name}
                reference={`${variableName}.${prop.name}`}
                value={formatCatalogPropertyValue(prop)}
                onEdit={() => setEditingPropertyId(prop.id)}
                onRemove={() => setProperties(properties.filter((property) => property.id !== prop.id))}
              />
            )
          )}
        </div>

        {isAddingProperty && (
          <div className="mt-2 p-3 rounded-md border border-border space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-muted">Quick add:</span>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingProperty(false);
                setNewProperty(emptyNewProperty);
                setPropertyErrors({});
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
        rows={2}
      />
    </CatalogEditorPanel>
  );
}
