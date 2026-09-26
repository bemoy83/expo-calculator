'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PriceForm } from '@/components/materials/PriceForm';
import { PropertyForm } from '@/components/materials/PropertyForm';
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
import { COMMON_MATERIAL_PROPERTIES, Material, MaterialProperty, MaterialPropertyType } from '@/lib/types';
import { formatCatalogPropertyValue } from '@/lib/catalog/catalog-display';
import { propertyValueInUnit } from '@/lib/catalog/prices';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import { getUnitCategory } from '@/lib/units';
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
  onDelete?: (id: string) => void;
  /** Modules whose formulas reference this material. */
  usageCount: number;
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

export function MaterialEditorPanel({
  material,
  materials,
  onSave,
  onClose,
  onDelete,
  usageCount,
}: MaterialEditorPanelProps) {
  const [formData, setFormData] = useState<MaterialFormData>(() => toFormData(material));
  const [errors, setErrors] = useState<Record<string, string>>({});
  useClearErrorsOnChange(formData, setErrors);
  const [properties, setProperties] = useState<MaterialProperty[]>(() =>
    material?.properties ? [...material.properties] : []
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [newProperty, setNewProperty] = useState<NewMaterialProperty>(emptyNewProperty);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  // Other prices are price properties; they're edited in the Prices section.
  const [priceFormFor, setPriceFormFor] = useState<string | 'new' | null>(null);
  const prices = properties.filter((property) => property.type === 'price');
  const otherProperties = properties.filter((property) => property.type !== 'price');

  useEffect(() => {
    setFormData(toFormData(material));
    setProperties(material?.properties ? [...material.properties] : []);
    setErrors({});
    setPropertyErrors({});
    setEditingPropertyId(null);
    setNewProperty(emptyNewProperty);
    setIsAddingProperty(false);
    setPriceFormFor(null);
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
    const nameError =
      newProperty.name.trim() === 'price'
        ? '“price” means the default price in formulas; use another name.'
        : validatePropertyName(properties, newProperty.name);
    if (nameError) {
      setPropertyErrors({ ...propertyErrors, new: nameError });
      return;
    }

    let value: number | string | boolean;
    let normalized: Pick<MaterialProperty, 'storedValue' | 'unitCategory'> = {};

    if (newProperty.type === 'number' || newProperty.type === 'price') {
      const rawValue = Number(newProperty.value) || 0;
      value = rawValue;
      normalized = normalizeNumericProperty(rawValue, newProperty.unitSymbol, newProperty.type);
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
    setIsAddingProperty(false);
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

  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const variableName = formData.variableName.trim();

  return (
    <CatalogEditorPanel
      title={isCreating ? 'New material' : 'Edit material'}
      subtitle={isCreating ? undefined : `used in ${usageCount} ${usageCount === 1 ? 'module' : 'modules'}`}
      submitLabel={isCreating ? 'Create' : 'Save'}
      onSubmit={handleSubmit}
      onClose={onClose}
      onDelete={material && onDelete ? () => onDelete(material.id) : undefined}
      deleteName={material?.name}
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

      <div>
        <PanelSectionHeading
          aside={
            priceFormFor === null && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPriceFormFor('new')}>
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add price
              </Button>
            )
          }
        >
          Prices
        </PanelSectionHeading>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <Input
            label="Default price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(event) => setFormData({ ...formData, price: event.target.value })}
            error={errors.price}
            required
            className="font-numeric"
          />
          <Input
            label="Per"
            value={formData.unit}
            onChange={(event) => setFormData({ ...formData, unit: event.target.value })}
            error={errors.unit}
            required
          />
        </div>
        <div className="mt-2">
          <FormulaReference
            variableName={variableName ? `${variableName}.price` : ''}
            value={`${formatCurrency(Number(formData.price) || 0)} / ${formData.unit.trim() || 'unit'}`}
          />
        </div>
        <div className="mt-1">
          {prices.map((price) =>
            priceFormFor === price.id ? (
              <PriceForm
                key={price.id}
                price={price}
                validateName={(name, id) => validatePropertyName(properties, name, id)}
                onSave={(updated) => {
                  setProperties(properties.map((property) => (property.id === updated.id ? updated : property)));
                  setPriceFormFor(null);
                }}
                onCancel={() => setPriceFormFor(null)}
              />
            ) : (
              <CatalogPropertyRow
                key={price.id}
                name={price.name}
                reference={`${variableName}.${price.name}`}
                value={`${formatCurrency(propertyValueInUnit(price) ?? 0)}${price.unitSymbol ? ` / ${price.unitSymbol}` : ''}`}
                onEdit={() => setPriceFormFor(price.id)}
                onRemove={() => setProperties(properties.filter((property) => property.id !== price.id))}
              />
            )
          )}
        </div>
        {priceFormFor === 'new' && (
          <PriceForm
            validateName={(name, id) => validatePropertyName(properties, name, id)}
            onSave={(price) => {
              setProperties([...properties, price]);
              setPriceFormFor(null);
            }}
            onCancel={() => setPriceFormFor(null)}
          />
        )}
        {prices.length === 0 && priceFormFor === null && (
          <p className="mt-2 text-xs text-ink-muted">
            Sold more than one way? Add a price per m², per sheet or per pallet instead of listing the material twice.
          </p>
        )}
      </div>

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

        {otherProperties.length === 0 && !isAddingProperty && (
          <p className="mt-1 text-xs text-draft">
            No properties. Modules that read one (e.g. <code className="font-numeric">{variableName || 'name'}.thickness</code>) can&apos;t calculate.
          </p>
        )}

        <div className="mt-1">
          {otherProperties.map((prop) =>
            editingPropertyId === prop.id ? (
              <div key={prop.id} className="my-2 p-3 rounded-md border border-border">
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="SKU"
          value={formData.sku}
          onChange={(event) => setFormData({ ...formData, sku: event.target.value })}
          className="font-numeric"
        />
        <Input
          label="Supplier"
          value={formData.supplier}
          onChange={(event) => setFormData({ ...formData, supplier: event.target.value })}
        />
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
