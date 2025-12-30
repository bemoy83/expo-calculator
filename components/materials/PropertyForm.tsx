'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { MaterialProperty, MaterialPropertyType } from '@/lib/types';
import { getAllUnitSymbols, getUnitCategory, convertFromBase } from '@/lib/units';
import { Plus } from 'lucide-react';

interface PropertyFormProps {
  property: MaterialProperty | null; // null for new property
  propertyData: {
    name: string;
    type: MaterialPropertyType;
    value: string | number | boolean;
    unitSymbol?: string;
  };
  error?: string;
  onChange: (updates: {
    name?: string;
    type?: MaterialPropertyType;
    value?: string | number | boolean;
    unitSymbol?: string;
  }) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  mode: 'create' | 'edit';
}

export function PropertyForm({
  property,
  propertyData,
  error,
  onChange,
  onSubmit,
  onCancel,
  mode,
}: PropertyFormProps) {
  const isEditMode = mode === 'edit';
  const isNumberOrPrice = propertyData.type === 'number' || propertyData.type === 'price';

  // For edit mode with number/price types, handle unit conversion for display
  const displayValue = isEditMode && property && isNumberOrPrice && typeof propertyData.value === 'number'
    ? property.unitSymbol && property.storedValue !== undefined
      ? convertFromBase(property.storedValue, property.unitSymbol)
      : propertyData.value
    : typeof propertyData.value === 'number' || typeof propertyData.value === 'string'
    ? propertyData.value
    : '';

  const handleTypeChange = (newType: MaterialPropertyType) => {
    let newValue: string | number | boolean;
    if (newType === 'number' || newType === 'price') {
      newValue = isEditMode && typeof propertyData.value === 'number' ? propertyData.value : '';
    } else if (newType === 'boolean') {
      newValue = isEditMode && typeof propertyData.value === 'boolean' ? propertyData.value : false;
    } else {
      newValue = typeof propertyData.value === 'string' ? propertyData.value : '';
    }
    onChange({ type: newType, value: newValue });
  };

  const handleValueChange = (newValue: string) => {
    if (isNumberOrPrice) {
      const numValue = Number(newValue) || 0;
      onChange({ value: numValue });
    } else if (propertyData.type === 'boolean') {
      onChange({ value: newValue === 'true' });
    } else {
      onChange({ value: newValue });
    }
  };

  return (
    <div className="space-y-2">
      <Input
        label="Property Name"
        value={propertyData.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={error}
        placeholder={isEditMode ? "e.g., length" : "e.g., mdf_sheet_width"}
        className="text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select
          label="Type"
          value={propertyData.type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialPropertyType)}
          options={[
            { value: 'number', label: 'Number' },
            { value: 'price', label: 'Price' },
            { value: 'string', label: 'String' },
            { value: 'boolean', label: 'Boolean' },
          ]}
        />
        <Select
          label="Unit (optional)"
          value={propertyData.unitSymbol || ''}
          onChange={(e) => onChange({ unitSymbol: e.target.value || undefined })}
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
        {isNumberOrPrice && (
          <Input
            label="Value"
            type="number"
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            className="text-sm"
          />
        )}
        {propertyData.type === 'boolean' && (
          <Select
            label="Value"
            value={typeof propertyData.value === 'boolean' 
              ? (propertyData.value ? 'true' : 'false')
              : String(propertyData.value)}
            onChange={(e) => handleValueChange(e.target.value)}
            options={[
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' },
            ]}
          />
        )}
        {propertyData.type === 'string' && (
          <Input
            label="Value"
            value={typeof propertyData.value === 'string' ? propertyData.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="text-sm"
          />
        )}
      </div>
      <div className="flex gap-2">
        {isEditMode && onCancel ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="flex-1"
          >
            Done
          </Button>
        ) : (
          <Button
            type="button"
            size={isEditMode ? "sm" : "md"}
            onClick={onSubmit}
            className={isEditMode ? "flex-1" : "gap-2 w-full"}
            disabled={!propertyData.name.trim()}
          >
            {isEditMode ? 'Done' : (
              <>
                <Plus className="h-4 w-4" />
                Add Property
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

