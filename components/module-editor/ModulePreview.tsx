'use client';

import React from 'react';
import { Field, Material } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { normalizeToBase, convertFromBase } from '@/lib/units';
import { X } from 'lucide-react';

interface ModulePreviewProps {
  formData: {
    name: string;
    description?: string;
    category?: string;
  };
  fields: Field[];
  previewFieldValues: Record<string, string | number | boolean>;
  previewCalculatedCost: number;
  previewError: string | null;
  materials: Material[];
  onClose: () => void;
  onFieldValueChange: (fieldVariableName: string, value: string | number | boolean) => void;
}

export function ModulePreview({
  formData,
  fields,
  previewFieldValues,
  previewCalculatedCost,
  previewError,
  materials,
  onClose,
  onFieldValueChange,
}: ModulePreviewProps) {
  // Helper to format label with unit
  const formatLabel = (label: string, unit?: string, unitSymbol?: string) => {
    if (unitSymbol) return `${label} (${unitSymbol})`;
    if (unit) return `${label} (${unit})`;
    return label;
  };

  return (
    <div 
      className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      tabIndex={-1}
    >
      <div 
        className="bg-md-surface-container border border-md-outline rounded-xl overflow-hidden transition-smooth w-full max-w-3xl max-h-[90vh] overflow-y-auto elevation-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview Card Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-md-primary">
              {formData.name || 'Module Preview'}
            </span>
            <Chip size="sm">Preview</Chip>
            {formData.category && (
              <Chip size="sm">{formData.category}</Chip>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-md-on-surface-variant hover:text-md-on-surface transition-colors"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Card Content */}
        <div className="px-4 pb-6">
          {formData.description && (
            <p className="text-sm text-md-on-surface-variant mb-5 mt-4">{formData.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {fields.map((field) => {
              const value = previewFieldValues[field.variableName];

              switch (field.type) {
                case 'number': {
                  let displayValue: number;
                  if (field.unitSymbol && typeof value === 'number') {
                    displayValue = convertFromBase(value, field.unitSymbol);
                  } else {
                    displayValue = typeof value === 'number' ? value : (value === '' ? NaN : Number(value) || 0);
                  }
                  
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
                        {formatLabel(field.label, field.unit, field.unitSymbol)}
                        {field.required && <span className="text-md-error ml-1">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-md-on-surface-variant mb-1.5">
                          {field.description}
                        </p>
                      )}
                      <Input
                        type="number"
                        value={isNaN(displayValue) ? '' : displayValue.toString()}
                        onChange={(e) => {
                          const inputValue = e.target.value === '' ? '' : Number(e.target.value) || 0;
                          const baseValue = field.unitSymbol && typeof inputValue === 'number'
                            ? normalizeToBase(inputValue, field.unitSymbol)
                            : inputValue;
                          onFieldValueChange(field.variableName, baseValue);
                        }}
                        required={field.required}
                      />
                    </div>
                  );
                }
                case 'boolean':
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
                        {formatLabel(field.label, field.unit, field.unitSymbol)}
                        {field.required && <span className="text-md-error ml-1">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-md-on-surface-variant mb-1.5">
                          {field.description}
                        </p>
                      )}
                      <Checkbox
                        label=""
                        checked={Boolean(value)}
                        onChange={(e) => {
                          onFieldValueChange(field.variableName, e.target.checked);
                        }}
                      />
                    </div>
                  );
                case 'dropdown': {
                  const options = field.options || [];
                  
                  if (field.dropdownMode === 'numeric' && field.unitSymbol) {
                    const displayOptions = options.map(opt => {
                      const numValue = Number(opt.trim());
                      if (!isNaN(numValue)) {
                        return `${opt.trim()} ${field.unitSymbol}`;
                      }
                      return opt;
                    });
                    
                    let currentDisplayValue = '';
                    if (typeof value === 'number') {
                      const displayValue = convertFromBase(value, field.unitSymbol);
                      const matchingIndex = options.findIndex(opt => {
                        const optNum = Number(opt.trim());
                        return !isNaN(optNum) && Math.abs(optNum - displayValue) < 0.0001;
                      });
                      if (matchingIndex >= 0) {
                        currentDisplayValue = displayOptions[matchingIndex];
                      } else {
                        currentDisplayValue = `${displayValue} ${field.unitSymbol}`;
                      }
                    } else {
                      currentDisplayValue = value?.toString() || '';
                    }
                    
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
                          {formatLabel(field.label, field.unit, field.unitSymbol)}
                          {field.required && <span className="text-md-error ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-xs text-md-on-surface-variant mb-1.5">
                            {field.description}
                          </p>
                        )}
                        <Select
                          label=""
                          value={currentDisplayValue}
                          onChange={(e) => {
                            const selectedDisplay = e.target.value;
                            const match = selectedDisplay.match(/^([\d.]+)/);
                            if (match && field.unitSymbol) {
                              const numValue = Number(match[1]);
                              if (!isNaN(numValue)) {
                                const baseValue = normalizeToBase(numValue, field.unitSymbol);
                                onFieldValueChange(field.variableName, baseValue);
                              }
                            }
                          }}
                          options={[
                            { value: '', label: 'Select...' },
                            ...displayOptions.map((displayOpt) => ({
                              value: displayOpt,
                              label: displayOpt,
                            })),
                          ]}
                        />
                      </div>
                    );
                  }
                  
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
                        {formatLabel(field.label, field.unit, field.unitSymbol)}
                        {field.required && <span className="text-md-error ml-1">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-md-on-surface-variant mb-1.5">
                          {field.description}
                        </p>
                      )}
                      <Select
                        label=""
                        value={value?.toString() || ''}
                        onChange={(e) => {
                          onFieldValueChange(field.variableName, e.target.value);
                        }}
                        options={[
                          { value: '', label: 'Select...' },
                          ...options.map((opt) => ({ value: opt, label: opt })),
                        ]}
                      />
                    </div>
                  );
                }
                case 'material': {
                  const materialCategory = field.materialCategory;
                  let availableMaterials = materials;
                  
                  if (materialCategory && materialCategory.trim()) {
                    availableMaterials = materials.filter((mat) => mat.category === materialCategory);
                  }
                  
                  const sortedMaterials = availableMaterials.sort((a, b) => a.name.localeCompare(b.name));
                  
                  return (
                    <div key={field.id}>
                      <div className="mb-1.5">
                        <label className="block text-sm font-medium text-md-on-surface-variant">
                          {formatLabel(field.label, field.unit, field.unitSymbol)}
                          {field.required && <span className="text-md-error ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-xs text-md-on-surface-variant mt-0.5">
                            {field.description}
                          </p>
                        )}
                      </div>
                      <Select
                        label=""
                        value={value?.toString() || ''}
                        onChange={(e) => {
                          onFieldValueChange(field.variableName, e.target.value);
                        }}
                        options={[
                          { value: '', label: 'Select a material...' },
                          ...sortedMaterials.map((mat) => ({
                            value: mat.variableName,
                            label: `${mat.name} - $${mat.price.toFixed(2)}/${mat.unit}`,
                          })),
                        ]}
                      />
                      {materialCategory && sortedMaterials.length === 0 && (
                        <p className="text-xs text-md-on-surface-variant mt-1">
                          No materials available in category &quot;{materialCategory}&quot;.
                        </p>
                      )}
                    </div>
                  );
                }
                case 'text':
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
                        {formatLabel(field.label, field.unit, field.unitSymbol)}
                        {field.required && <span className="text-md-error ml-1">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-md-on-surface-variant mb-1.5">
                          {field.description}
                        </p>
                      )}
                      <Input
                        label=""
                        value={value?.toString() || ''}
                        onChange={(e) => {
                          onFieldValueChange(field.variableName, e.target.value);
                        }}
                        required={field.required}
                      />
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {/* Calculated Cost */}
          <div className="flex items-center justify-between pt-5 border-t border-border">
            <span className="text-sm font-semibold text-md-on-surface-variant uppercase tracking-wide">Module Cost</span>
            {previewError ? (
              <span className="text-sm text-md-on-surface-variant">
                {previewError}
              </span>
            ) : (
              <span className="text-2xl font-bold text-success tabular-nums tracking-tight">
                ${previewCalculatedCost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


