'use client';

import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Field, FieldType } from '@/lib/types';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { labelToVariableName } from '@/lib/utils';
import { getAllUnitSymbols, getUnitCategory } from '@/lib/units';
import { ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Trash2, GripVertical } from 'lucide-react';

interface SortableFieldItemProps {
  field: Field;
  isExpanded: boolean;
  fieldError: Record<string, string>;
  onToggleExpanded: (fieldId: string) => void;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
  onRemoveField: (id: string) => void;
  fieldRef?: (el: HTMLDivElement | null) => void;
}

export function SortableFieldItem({
  field,
  isExpanded,
  fieldError,
  onToggleExpanded,
  onUpdateField,
  onRemoveField,
  fieldRef,
}: SortableFieldItemProps) {
  // Get materials from store for category dropdown
  const materials = useMaterialsStore((state) => state.materials);
  
  // Local state to preserve trailing commas in dropdown options input
  const [dropdownOptionsInput, setDropdownOptionsInput] = useState(
    field.options?.join(', ') || ''
  );
  
  // Ref to track if update is from user input (to prevent useEffect from overwriting)
  const isUserInputRef = useRef(false);
  
  // Sync local state when field.options changes externally (e.g., when field is loaded or type changes)
  useEffect(() => {
    // Skip sync if the change came from user input
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }
    
    if (field.type === 'dropdown') {
      const currentValue = field.options?.join(', ') || '';
      setDropdownOptionsInput(currentValue);
    } else {
      // Reset when field type changes away from dropdown
      setDropdownOptionsInput('');
    }
  }, [field.id, field.type, field.options, isExpanded]); // Sync when field ID, type, options, or expansion state changes
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Combine sortable ref with field ref for scrolling
  const combinedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (fieldRef) {
      fieldRef(el);
    }
  };

  return (
    <Card
    ref={combinedRef}
    style={style}
    variant="default"  
    >
      {/* Field Header */}
      <div className="flex items-center">
        {/* Drag Handle - Left Side */}
        <button
          {...attributes}
          {...listeners}
          className="text-md-on-surface-variant hover:text-md-primary cursor-grab active:cursor-grabbing focus:outline-none transition-smooth"
          aria-label={`Drag to reorder ${field.label || 'field'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Field Content */}
        <div
          className="flex items-center justify-between flex-1 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-extra-large"
          onClick={() => onToggleExpanded(field.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpanded(field.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} field ${field.label || 'Unnamed Field'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-md-primary">
                {field.label || 'Unnamed Field'}
              </span>
              {field.variableName && (
                <Chip size="sm" variant="primary" className="font-mono">
                {field.variableName}
              </Chip>
              )}
              <Chip size="sm" variant="default" className="capitalize">
                {field.type}
              </Chip>
              {field.required && (
                <Chip size="sm" variant="error">
                Required
              </Chip>
              )}
            </div>
            {field.description && (
              <p className="text-sm text-md-on-surface-variant mt-1.5 truncate">
                {field.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Remove this field?')) {
                  onRemoveField(field.id);
                }
              }}
              className="p-2 text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container/10 rounded-full transition-smooth active:scale-95"
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Field Form */}
      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Field Label"
              value={field.label}
              onChange={(e) => {
                const newLabel = e.target.value;
                const inferredVarName = labelToVariableName(newLabel);
                onUpdateField(field.id, { 
                  label: newLabel,
                  variableName: inferredVarName
                });
              }}
              error={fieldError.label}
              placeholder="e.g., Width"
            />
            <Input
              label="Variable Name"
              value={field.variableName}
              onChange={(e) => onUpdateField(field.id, { variableName: e.target.value })}
              error={fieldError.variableName}
              placeholder="e.g., width"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Field Type"
              value={field.type}
              onChange={(e) => onUpdateField(field.id, { type: e.target.value as FieldType })}
              options={[
                { value: 'number', label: 'Number' },
                { value: 'text', label: 'Text' },
                { value: 'dropdown', label: 'Dropdown' },
                { value: 'boolean', label: 'Boolean' },
                { value: 'material', label: 'Material' },
              ]}
            />
            {field.type === 'number' && (
              <Select
                label="Unit (optional)"
                value={field.unitSymbol || ''}
                onChange={(e) => {
                  const unitSymbol = e.target.value || undefined;
                  const unitCategory = unitSymbol ? getUnitCategory(unitSymbol) : undefined;
                  onUpdateField(field.id, { 
                    unitSymbol,
                    unitCategory,
                    // Keep legacy unit field for backward compatibility
                    unit: unitSymbol || undefined,
                  });
                }}
                options={[
                  { value: '', label: 'None (unitless)' },
                  ...getAllUnitSymbols().map(symbol => ({
                    value: symbol,
                    label: `${symbol}${getUnitCategory(symbol) ? ` (${getUnitCategory(symbol)})` : ''}`,
                  })),
                ]}
              />
            )}
            {field.type === 'dropdown' && (
              <Select
                label="Dropdown Mode"
                value={field.dropdownMode || 'string'}
                onChange={(e) => {
                  const dropdownMode = e.target.value as 'numeric' | 'string';
                  const updates: Partial<Field> = { dropdownMode };
                  // If switching to string mode, clear unit info
                  if (dropdownMode === 'string') {
                    updates.unitSymbol = undefined;
                    updates.unitCategory = undefined;
                    updates.unit = undefined;
                  }
                  onUpdateField(field.id, updates);
                }}
                options={[
                  { value: 'string', label: 'Values are strings' },
                  { value: 'numeric', label: 'Values are numeric with units' },
                ]}
              />
            )}
            {field.type === 'material' && (
              <Select
                label="Limit to Material Category (optional)"
                value={field.materialCategory || ''}
                onChange={(e) => onUpdateField(field.id, { materialCategory: e.target.value || undefined })}
                options={[
                  { value: '', label: 'All Categories' },
                  ...Array.from(new Set((materials ?? []).map((m) => m.category)))
                    .sort()
                    .map((cat) => ({ value: cat, label: cat })),
                ]}
              />
            )}
          </div>
          {field.type === 'dropdown' && (
            <div>
              {field.dropdownMode === 'numeric' && (
                <Select
                  label="Unit (optional)"
                  value={field.unitSymbol || ''}
                  onChange={(e) => {
                    const unitSymbol = e.target.value || undefined;
                    const unitCategory = unitSymbol ? getUnitCategory(unitSymbol) : undefined;
                    onUpdateField(field.id, { 
                      unitSymbol,
                      unitCategory,
                      unit: unitSymbol || undefined,
                    });
                  }}
                  options={[
                    { value: '', label: 'None (unitless)' },
                    ...getAllUnitSymbols().map(symbol => ({
                      value: symbol,
                      label: `${symbol}${getUnitCategory(symbol) ? ` (${getUnitCategory(symbol)})` : ''}`,
                    })),
                  ]}
                />
              )}
              <Input
                label="Options (comma-separated)"
                value={dropdownOptionsInput}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  
                  // Mark that this is user input
                  isUserInputRef.current = true;
                  
                  // Update local state immediately to preserve trailing commas
                  setDropdownOptionsInput(rawValue);
                  
                  // Process options: split by comma, trim, and filter out empty strings
                  // This allows trailing commas to remain in the input while still updating the options array
                  const options = rawValue
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  
                  // Update the field with the processed options
                  onUpdateField(field.id, { options });
                }}
                error={fieldError.options}
                placeholder={field.dropdownMode === 'numeric' ? "40, 60" : "Option 1, Option 2, Option 3"}
              />
            </div>
          )}
          {(field.type === 'number' || field.type === 'text') && (
            <Input
              label="Default Value (optional)"
              type={field.type === 'number' ? 'number' : 'text'}
              value={field.defaultValue?.toString() || ''}
              onChange={(e) => {
                const value = field.type === 'number' 
                  ? (e.target.value ? Number(e.target.value) : undefined)
                  : e.target.value || undefined;
                onUpdateField(field.id, { defaultValue: value });
              }}
            />
          )}
          {field.type === 'material' && (
            <div className="text-xs text-md-on-surface-variant">
              The material variable represents the price of the selected material in your formula. If you&apos;ve selected a category above, only materials from that category will be available in the Quote Builder.
            </div>
          )}
          <Input
            label="Description (optional)"
            value={field.description || ''}
            onChange={(e) => onUpdateField(field.id, { description: e.target.value || undefined })}
            placeholder="Help text for users..."
          />
          <Checkbox
            label="Required Field"
            checked={field.required || false}
            onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
          />
        </div>
      )}
    </Card>
  );
}



