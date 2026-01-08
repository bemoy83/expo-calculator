'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LaborProperty } from '@/lib/types';
import { getAllUnitSymbols, getUnitCategory, convertFromBase } from '@/lib/units';
import { labelToVariableName } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface LaborPropertyFormProps {
  property: LaborProperty | null; // null for new property
  propertyData: {
    name: string;
    value: number;
    unitSymbol?: string;
  };
  error?: string;
  onChange: (updates: {
    name?: string;
    value?: number;
    unitSymbol?: string;
  }) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  mode: 'create' | 'edit';
}

export function LaborPropertyForm({
  property,
  propertyData,
  error,
  onChange,
  onSubmit,
  onCancel,
  mode,
}: LaborPropertyFormProps) {
  const isEditMode = mode === 'edit';
  
  // Track if user has manually edited the variable name
  const [hasManuallyEditedVariableName, setHasManuallyEditedVariableName] = useState(false);
  const [displayName, setDisplayName] = useState(isEditMode && property ? property.name : '');

  // Auto-generate variable name from display name when display name changes
  useEffect(() => {
    if (!isEditMode && displayName && !hasManuallyEditedVariableName) {
      const generatedName = labelToVariableName(displayName);
      if (generatedName && generatedName !== propertyData.name) {
        onChange({ name: generatedName });
      }
    }
  }, [displayName, hasManuallyEditedVariableName, propertyData.name, isEditMode, onChange]);

  // For edit mode, handle unit conversion for display
  const displayValue = isEditMode && property && property.unitSymbol && property.storedValue !== undefined
    ? convertFromBase(property.storedValue, property.unitSymbol)
    : propertyData.value;

  const handleDisplayNameChange = (newDisplayName: string) => {
    setDisplayName(newDisplayName);
    if (!isEditMode && !hasManuallyEditedVariableName) {
      const generatedName = labelToVariableName(newDisplayName);
      if (generatedName) {
        onChange({ name: generatedName });
      }
    }
  };

  const handleVariableNameChange = (newName: string) => {
    setHasManuallyEditedVariableName(true);
    onChange({ name: newName });
  };

  const handleValueChange = (newValue: string) => {
    const numValue = Number(newValue) || 0;
    onChange({ value: numValue });
  };

  return (
    <div className="space-y-2">
      {!isEditMode ? (
        <>
          <Input
            label="Property Name"
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            error={error}
            placeholder=""
            className="text-sm"
          />
          <div>
            <Input
              label="Variable Name"
              value={propertyData.name}
              onChange={(e) => handleVariableNameChange(e.target.value)}
              placeholder=""
              className="text-sm"
            />
            <p className="mt-1 text-xs text-md-on-surface-variant">
              Used in formulas. Must be a valid identifier (letters, numbers, underscores only, starting with letter or underscore). Auto-generated from property name.
            </p>
          </div>
        </>
      ) : (
        <Input
          label="Property Name"
          value={propertyData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          error={error}
            placeholder=""
          className="text-sm"
        />
      )}
      <div className="grid grid-cols-2 gap-2">
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
        <Input
          label="Value"
          type="number"
          step="0.01"
          min="0"
          value={displayValue}
          onChange={(e) => handleValueChange(e.target.value)}
          className="text-sm"
        />
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

