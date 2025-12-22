'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { CalculationModule, Field, FieldType } from '@/lib/types';
import { validateFormula, evaluateFormula } from '@/lib/formula-evaluator';
import { labelToVariableName, cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown,
  GripVertical,
  CheckCircle2,
  XCircle,
  Calculator,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  'Foundation',
  'Framing',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Labor',
  'Materials',
  'Other'
];

/**
 * Sortable Field Item Component
 * Wraps each field card with drag-and-drop functionality
 */
interface SortableFieldItemProps {
  field: Field;
  isExpanded: boolean;
  fieldError: Record<string, string>;
  index: number;
  fields: Field[];
  expandedFields: Set<string>;
  onToggleExpanded: (fieldId: string) => void;
  onUpdateField: (id: string, updates: Partial<Field>) => void;
  onRemoveField: (id: string) => void;
  module: CalculationModule | null;
  availableVariables: Array<{ name: string; label: string; type: string }>;
}

function SortableFieldItem({
  field,
  isExpanded,
  fieldError,
  onToggleExpanded,
  onUpdateField,
  onRemoveField,
}: SortableFieldItemProps) {
  // Get materials from store for category dropdown
  const materials = useMaterialsStore((state) => state.materials);
  
  // Local state to preserve trailing commas in dropdown options input
  const [dropdownOptionsInput, setDropdownOptionsInput] = useState(
    field.options?.join(', ') || ''
  );
  
  // Sync local state when field.options changes externally (e.g., when field is loaded or type changes)
  useEffect(() => {
    if (field.type === 'dropdown') {
      const currentValue = field.options?.join(', ') || '';
      setDropdownOptionsInput(currentValue);
    } else {
      // Reset when field type changes away from dropdown
      setDropdownOptionsInput('');
    }
  }, [field.id, field.type, isExpanded]); // Sync when field ID, type, or expansion state changes
  
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-xl overflow-hidden transition-smooth overlay-white"
    >
      {/* Field Header */}
      <div className="flex items-center">
        {/* Drag Handle - Left Side */}
        <button
          {...attributes}
          {...listeners}
          className="p-3 text-muted-foreground hover:text-accent cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset transition-smooth"
          aria-label={`Drag to reorder ${field.label || 'field'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Field Content */}
        <div
          className="flex items-center justify-between flex-1 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-lg"
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
              <span className="font-semibold text-card-foreground">
                {field.label || 'Unnamed Field'}
              </span>
              {field.variableName && (
                <code className="px-2.5 py-0.5 bg-accent text-accent-foreground rounded-full text-xs font-mono">
                  {field.variableName}
                </code>
              )}
              <span className="px-2.5 py-0.5 bg-muted border border-border rounded-full text-xs text-muted-foreground capitalize">
                {field.type}
              </span>
              {field.required && (
                <span className="px-2.5 py-0.5 bg-destructive text-destructive-foreground rounded-full text-xs font-medium">
                  Required
                </span>
              )}
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground mt-1.5 truncate">
                {field.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(field.id);
              }}
              className="p-2 text-muted-foreground hover:text-foreground hover-overlay rounded-lg transition-smooth active:scale-95 relative"
              aria-label={isExpanded ? 'Collapse field' : 'Expand field'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Remove this field?')) {
                  onRemoveField(field.id);
                }
              }}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-smooth active:scale-95"
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Field Form */}
      {isExpanded && (
        <div className="p-5 border-t border-border space-y-4 bg-muted/20">
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
              <Input
                label="Unit (optional)"
                value={field.unit || ''}
                onChange={(e) => onUpdateField(field.id, { unit: e.target.value || undefined })}
                placeholder="e.g., ft, sq ft, hours"
              />
            )}
          </div>
          {field.type === 'dropdown' && (
            <div>
              <Input
                label="Options (comma-separated)"
                value={dropdownOptionsInput}
                onChange={(e) => {
                  const rawValue = e.target.value;
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
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}
          {field.type === 'material' && (
            <>
              <div className="p-3 mb-4">
                <p className="text-xs text-accent mb-2">
                  <strong>Material Field:</strong> Users will select from the Materials Catalog. 
                  The selected material's price will be used automatically in formulas when you reference this field's variable name.
                </p>
              </div>
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
              <p className="text-xs text-muted-foreground -mt-2">
                If you select a category, this field will only show materials from that category in the Quote Builder.
              </p>
            </>
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
            <div className="text-xs text-muted-foreground">
              Default value: Leave empty or set a material variable name (e.g., mat_kvirke_48x98)
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
    </div>
  );
}

export default function ModulesPage() {
  const modules = useModulesStore((state) => state.modules);
  const addModule = useModulesStore((state) => state.addModule);
  const updateModule = useModulesStore((state) => state.updateModule);
  const deleteModule = useModulesStore((state) => state.deleteModule);
  const materials = useMaterialsStore((state) => state.materials);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    formula: '',
  });
  const [fields, setFields] = useState<Field[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, Record<string, string>>>({});
  const [formulaValidation, setFormulaValidation] = useState<{ valid: boolean; error?: string; preview?: number }>({ valid: false });
  const formulaTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize editing state
  const startEditing = (module?: CalculationModule) => {
    if (module) {
      setEditingModuleId(module.id);
      setFormData({
        name: module.name,
        description: module.description || '',
        category: module.category || '',
        formula: module.formula,
      });
      setFields(module.fields.map((f) => ({ ...f })));
      setExpandedFields(new Set(module.fields.map(f => f.id)));
    } else {
      setEditingModuleId('new');
      setFormData({
        name: '',
        description: '',
        category: '',
        formula: '',
      });
      setFields([]);
      setExpandedFields(new Set());
    }
    setErrors({});
    setFieldErrors({});
  };

  const cancelEditing = () => {
    setEditingModuleId(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      formula: '',
    });
    setFields([]);
    setExpandedFields(new Set());
    setErrors({});
    setFieldErrors({});
    setFormulaValidation({ valid: false });
  };

  const toggleFieldExpanded = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  const addField = () => {
    const newField: Field = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'number',
      variableName: '',
      required: false,
    };
    setFields([...fields, newField]);
    setExpandedFields(new Set([...expandedFields, newField.id]));
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    // Re-validate formula when fields change
    if (formData.formula) {
      validateFormulaInput(formData.formula);
    }
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    const newExpanded = new Set(expandedFields);
    newExpanded.delete(id);
    setExpandedFields(newExpanded);
    // Re-validate formula when fields change
    if (formData.formula) {
      validateFormulaInput(formData.formula);
    }
  };

  /**
   * Drag-and-Drop Implementation
   * 
   * Uses @dnd-kit library for robust drag-and-drop functionality:
   * - @dnd-kit/core: Core drag-and-drop functionality
   * - @dnd-kit/sortable: Sortable list components
   * - @dnd-kit/utilities: CSS transform utilities
   * 
   * Field Order Persistence:
   * - Field order is stored in the fields array state
   * - When fields are reordered via drag-and-drop, the array is reordered using arrayMove()
   * - All field data (id, label, variableName, type, etc.) is preserved during reorder
   * - Formula variable mapping remains intact because variable names don't change
   * - Order persists when module is saved (fields array order is saved as-is)
   */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event - reorder fields array
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // Reorder fields array while preserving all field data
        // Formula variable mapping remains intact since variable names don't change
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Helper function to escape regex special characters
  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Helper function to check if a variable is present in the formula using word boundaries
  const isVariableInFormula = (variableName: string, formula: string): boolean => {
    if (!formula || !variableName) return false;
    // Use word boundaries to avoid partial matches (e.g., "width" in "widths")
    const regex = new RegExp(`\\b${escapeRegex(variableName)}\\b`);
    return regex.test(formula);
  };

  const insertVariableAtCursor = (variableName: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.formula;
    
    // Insert variable at cursor position
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    
    // Determine if we need spaces around the variable
    // Add space before if there's content before and it's not whitespace/operator
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore = start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '\t' && 
      !/[+\-*/(]/.test(charBefore);
    
    // Add space after if there's content after and it's not whitespace/operator
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter = end < currentValue.length && 
      charAfter !== ' ' && 
      charAfter !== '\t' && 
      !/[+\-*/)]/.test(charAfter);
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    const insertedText = `${spaceBefore}${variableName}${spaceAfter}`;
    
    const newValue = before + insertedText + after;
    const newCursorPos = start + insertedText.length;
    
    // Update state
    setFormData({ ...formData, formula: newValue });
    
    // Set cursor position after React updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const validateFormulaInput = (formula: string) => {
    if (!formula.trim()) {
      setFormulaValidation({ valid: false });
      return;
    }

    const availableVars = fields.map((f) => f.variableName).filter(Boolean);
    const validation = validateFormula(formula, availableVars, materials);

    if (validation.valid) {
      // Calculate preview with default values
      const defaultValues: Record<string, string | number | boolean> = {};
      fields.forEach(field => {
        if (field.variableName) {
          if (field.defaultValue !== undefined) {
            defaultValues[field.variableName] = field.defaultValue;
          } else {
            switch (field.type) {
              case 'number':
                defaultValues[field.variableName] = 1;
                break;
              case 'boolean':
                defaultValues[field.variableName] = true;
                break;
              default:
                defaultValues[field.variableName] = 1;
            }
          }
        }
      });

      try {
        const preview = evaluateFormula(formula, {
          fieldValues: defaultValues,
          materials,
        });
        setFormulaValidation({ valid: true, preview });
      } catch (error: any) {
        // If evaluation fails, show the error
        setFormulaValidation({ 
          valid: false, 
          error: error.message || 'Formula evaluation failed' 
        });
      }
    } else {
      setFormulaValidation({ valid: false, error: validation.error });
    }
  };

  useEffect(() => {
    if (formData.formula) {
      validateFormulaInput(formData.formula);
    } else {
      setFormulaValidation({ valid: false });
    }
  }, [formData.formula, fields, materials]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newFieldErrors: Record<string, Record<string, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Module name is required';
    }

    if (!formData.formula.trim()) {
      newErrors.formula = 'Formula is required';
    } else if (!formulaValidation.valid) {
      newErrors.formula = formulaValidation.error || 'Invalid formula';
    }

    fields.forEach((field) => {
      const fieldError: Record<string, string> = {};
      if (!field.label.trim()) {
        fieldError.label = 'Label is required';
      }
      if (!field.variableName.trim()) {
        fieldError.variableName = 'Variable name is required';
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.variableName)) {
        fieldError.variableName = 'Invalid variable name format';
      } else {
        const duplicates = fields.filter((f) => f.variableName === field.variableName);
        if (duplicates.length > 1) {
          fieldError.variableName = 'Variable name must be unique';
        }
      }
      if (field.type === 'dropdown' && (!field.options || field.options.length === 0)) {
        fieldError.options = 'At least one option is required for dropdown';
      }
      // Material fields don't need options - they pull from Materials Catalog
      if (Object.keys(fieldError).length > 0) {
        newFieldErrors[field.id] = fieldError;
      }
    });

    setErrors(newErrors);
    setFieldErrors(newFieldErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const moduleData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || undefined,
      formula: formData.formula.trim(),
      fields: fields.map((f) => ({
        ...f,
        label: f.label.trim(),
        variableName: f.variableName.trim(),
      })),
    };

    if (editingModuleId === 'new') {
      addModule(moduleData);
    } else if (editingModuleId) {
      updateModule(editingModuleId, moduleData);
    }

    cancelEditing();
  };

  const availableFieldVariables = fields
    .map((f) => f.variableName)
    .filter(Boolean)
    .map((varName) => {
      const field = fields.find((f) => f.variableName === varName);
      return {
        name: varName,
        label: field?.label || varName,
        type: field?.type || 'unknown',
        required: field?.required || false,
      };
    });
  
  // Calculate which fields are missing from the formula
  // Note: In formula builder, ALL fields are required (must be in formula)
  // The 'required' flag means "requires user input when using the module"
  const allFields = availableFieldVariables;
  const missingFields = allFields.filter(
    (v) => !isVariableInFormula(v.name, formData.formula)
  );
  
  // Calculate used fields for progress counter
  const usedFields = allFields.length - missingFields.length;
  
  // Calculate percentage of unused fields
  const unusedPercentage = allFields.length > 0 
    ? (missingFields.length / allFields.length) * 100 
    : 0;
  
  // Determine if we should show the reminder
  // Show if: less than 30% unused (70%+ used), OR edge case (2 of 3, 3 of 4, etc. - close to threshold)
  const shouldShowReminder = allFields.length > 0 && missingFields.length > 0 && (
    unusedPercentage < 30 || 
    // Edge case: if only 1 missing and at least 2 used (covers 2/3, 3/4, 4/5, etc.)
    (missingFields.length === 1 && usedFields >= 2)
  );
  
  // Keep track of required fields separately for visual indicators (green checkmarks, red borders)
  // These indicate fields that require user input when using the module
  const requiredFields = availableFieldVariables.filter((v) => v.required);

  // Filter material variables based on material field category filters
  // If any material fields have category filters, only show materials from those categories
  // If no category filters are set, show all materials
  const materialFields = fields.filter((f) => f.type === 'material');
  const materialCategories = materialFields
    .map((f) => f.materialCategory)
    .filter((cat): cat is string => Boolean(cat && cat.trim()));
  
  let filteredMaterials = materials;
  if (materialCategories.length > 0) {
    // Show materials from any of the selected categories (union)
    filteredMaterials = materials.filter((m) => materialCategories.includes(m.category));
  }

  const availableMaterialVariables = filteredMaterials.map((m) => ({
    name: m.variableName,
    label: m.name,
    price: m.price,
    unit: m.unit,
  }));

  // Show workspace if editing
  if (editingModuleId) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            {editingModuleId === 'new' ? 'Create Module' : 'Edit Module'}
          </h1>
          <p className="text-lg text-muted-foreground">Define → Configure → Calculate</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* MODULE DETAILS PANEL */}
            <Card title="Module Details">
              <div className="space-y-4">
                <Input
                  label="Module Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={errors.name}
                  placeholder="e.g., Floor Area Calculator"
                />
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe what this module calculates..."
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                          formData.category === cat
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* INPUT FIELDS MANAGER */}
            <Card
              title="Input Fields"
              actions={
                <Button size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              }
            >
              {fields.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No fields added yet</p>
                  <Button size="sm" onClick={addField} className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {fields.map((field, index) => {
                        const isExpanded = expandedFields.has(field.id);
                        const fieldError = fieldErrors[field.id] || {};

                        return (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            isExpanded={isExpanded}
                            fieldError={fieldError}
                            index={index}
                            fields={fields}
                            expandedFields={expandedFields}
                            onToggleExpanded={toggleFieldExpanded}
                            onUpdateField={updateField}
                            onRemoveField={removeField}
                            module={null}
                            availableVariables={[]}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN - FORMULA BUILDER */}
          <div className="lg:col-span-1">
            <Card title="Formula Builder" className="sticky top-8">
              <div className="space-y-6">
                {/* Available Variables */}
                {availableFieldVariables.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-card-foreground">Field Variables</h4>
                      {allFields.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {usedFields}/{allFields.length} fields
                        </span>
                      )}
                    </div>
                    {allFields.length > 0 && (
                      <>
                        {shouldShowReminder ? (
                          <div className="mb-3 p-2" role="status" aria-live="polite">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                                  Reminder: Add remaining fields to formula
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {missingFields.map((field) => (
                                    <span
                                      key={field.name}
                                      className="text-xs font-mono px-2 py-0.5 text-amber-600 dark:text-amber-400 rounded"
                                    >
                                      {field.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : missingFields.length > 0 ? (
                          <div className="mb-3 p-2 bg-muted/50 border border-border rounded-md">
                            <p className="text-xs text-muted-foreground">
                              <strong>Tip:</strong> Add field variables to your formula by clicking them above.
                            </p>
                          </div>
                        ) : null}
                      </>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {availableFieldVariables.map((varInfo) => {
                        const isInFormula = isVariableInFormula(varInfo.name, formData.formula);
                        const showCheckmark = isInFormula;
                        
                        return (
                          <button
                            key={varInfo.name}
                            type="button"
                            onClick={() => insertVariableAtCursor(varInfo.name)}
                            aria-label={`Insert variable ${varInfo.name} (${varInfo.label}, ${varInfo.type})${showCheckmark ? ' - already in formula' : ''}`}
                            title={`${varInfo.label} (${varInfo.type})`}
                            className={cn(
                              "px-3 py-1.5 border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background active:scale-95 shadow-sm hover:shadow-md flex items-center gap-1.5",
                              showCheckmark 
                                ? "border-success bg-success hover:bg-success/90 text-success-foreground" 
                                : "bg-accent text-accent-foreground hover:bg-muted hover:text-accent border-accent hover:border-border"
                            )}
                          >
                            <span>{varInfo.name}</span>
                            {showCheckmark && (
                              <CheckCircle2 className="h-3 w-3 text-success-foreground shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {availableMaterialVariables.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-card-foreground mb-3">Material Variables</h4>
                    <div className="flex flex-wrap gap-2">
                      {availableMaterialVariables.map((mat) => (
                        <button
                          key={mat.name}
                          type="button"
                          onClick={() => insertVariableAtCursor(mat.name)}
                          aria-label={`Insert material variable ${mat.name} (${mat.label} - $${mat.price.toFixed(2)} per ${mat.unit})`}
                          title={`${mat.label} - $${mat.price.toFixed(2)}/${mat.unit}`}
                          className="px-3 py-1.5 bg-accent text-accent-foreground hover:bg-muted hover:text-accent border border-accent hover:border-border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background active:scale-95 shadow-sm hover:shadow-md"
                        >
                          {mat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableFieldVariables.length === 0 && availableMaterialVariables.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <p>Add fields or materials to use variables in your formula</p>
                  </div>
                )}

                {/* Formula Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="formula-input" className="text-sm font-semibold text-card-foreground">Formula</label>
                    {formData.formula && (
                      <div className="flex items-center space-x-1" role="status" aria-live="polite">
                        {formulaValidation.valid ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                            <span className="text-xs text-accent font-medium">Valid</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                            <span className="text-xs text-destructive font-medium">Invalid</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Textarea
                    ref={formulaTextareaRef}
                    id="formula-input"
                    value={formData.formula}
                    onChange={(e) => {
                      setFormData({ ...formData, formula: e.target.value });
                    }}
                    error={errors.formula || formulaValidation.error}
                    placeholder="e.g., width * height * lumber_price"
                    rows={6}
                    className={`font-mono text-sm ${
                      formulaValidation.valid && formData.formula
                        ? 'border-success/50 focus:ring-success/50'
                        : formData.formula && !formulaValidation.valid
                        ? 'border-destructive/50 focus:ring-destructive/50'
                        : ''
                    }`}
                  />
                  {formulaValidation.error && (
                    <p className="mt-1 text-xs text-destructive" role="alert" aria-live="polite">
                      {formulaValidation.error}
                    </p>
                  )}
                  {formulaValidation.valid && formulaValidation.preview !== undefined && (
                    <div className="mt-2 p-3" role="status" aria-live="polite">
                      <div className="flex items-center space-x-2">
                        <Calculator className="h-4 w-4 text-accent" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">Preview (with defaults):</span>
                        <span className="text-sm font-bold text-success">
                          ${formulaValidation.preview.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operators Guide */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Supported Operators
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono">+</code> <span className="text-muted-foreground ml-1">Add</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">-</code> <span className="text-muted-foreground ml-1">Subtract</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">*</code> <span className="text-muted-foreground ml-1">Multiply</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">/</code> <span className="text-muted-foreground ml-1">Divide</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">()</code> <span className="text-muted-foreground ml-1">Grouping</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">sqrt()</code> <span className="text-muted-foreground ml-1">Square root</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">round(x)</code> <span className="text-muted-foreground ml-1">Round to nearest integer</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">round(x, decimals)</code> <span className="text-muted-foreground ml-1">Round to fixed decimals</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">ceil(x)</code> <span className="text-muted-foreground ml-1">Round up to next integer</span>
                    </div>
                    <div className="px-2 py-0.5">
                      <code className="text-accent font-mono font-semibold">floor(x)</code> <span className="text-muted-foreground ml-1">Round down to previous integer</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-xl px-4 py-4 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={cancelEditing} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="rounded-full">
              {editingModuleId === 'new' ? 'Create' : 'Update'} Module
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Default list view
  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Calculation Modules</h1>
          <p className="text-lg text-muted-foreground">Create reusable calculation modules with custom fields and formulas</p>
        </div>
        <Button onClick={() => startEditing()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted shadow-lg mb-6" aria-hidden="true">
              <Calculator className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">No Modules Yet</h3>
            <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">Create your first calculation module to get started building professional estimates.</p>
            <Button onClick={() => startEditing()} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card key={module.id} className="hover:border-accent/30 transition-smooth cursor-pointer group">
              <h3 className="text-lg font-bold text-card-foreground mb-3 group-hover:text-accent transition-smooth tracking-tight">{module.name}</h3>
              {module.category && (
                <div className="mb-3">
                  <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                    {module.category}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {module.description || 'No description'}
              </p>
              <div className="mb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Fields</p>
                <div className="flex flex-wrap gap-2">
                  {module.fields.map((field) => (
                    <span
                      key={field.id}
                      className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs"
                    >
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Formula:</p>
                <code className="block px-3 py-2 bg-muted rounded text-sm text-accent break-all">
                  {module.formula}
                </code>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => startEditing(module)}
                  className="flex-1"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this module?')) {
                      deleteModule(module.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
