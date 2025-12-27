'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useCategoriesStore } from '@/lib/stores/categories-store';
import { CalculationModule, Field, FieldType, QuoteModuleInstance } from '@/lib/types';
import { validateFormula, evaluateFormula, analyzeFormulaVariables } from '@/lib/formula-evaluator';
import { labelToVariableName, cn } from '@/lib/utils';
import { getAllUnitSymbols, getUnitCategory, normalizeToBase, convertFromBase } from '@/lib/units';
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
  ChevronRight,
  GripVertical,
  CheckCircle2,
  XCircle,
  Calculator,
  Eye
} from 'lucide-react';


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
  fieldRef?: (el: HTMLDivElement | null) => void;
}

function SortableFieldItem({
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
    <div
      ref={combinedRef}
      style={style}
      className="bg-md-surface-container border border-md-outline rounded-xl overflow-hidden transition-smooth elevation-1"
    >
      {/* Field Header */}
      <div className="flex items-center">
        {/* Drag Handle - Left Side */}
        <button
          {...attributes}
          {...listeners}
          className="p-3 text-md-on-surface-variant hover:text-md-primary cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-md-primary focus:ring-inset transition-smooth"
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
              <span className="font-semibold text-md-on-surface">
                {field.label || 'Unnamed Field'}
              </span>
              {field.variableName && (
                <code className="px-2.5 py-0.5 bg-md-primary text-md-primary-foreground rounded-full text-xs font-mono">
                  {field.variableName}
                </code>
              )}
              <span className="px-2.5 py-0.5 bg-md-surface-variant border border-border rounded-full text-xs text-md-on-surface-variant capitalize">
                {field.type}
              </span>
              {field.required && (
                <span className="px-2.5 py-0.5 bg-md-error text-md-on-error rounded-full text-xs font-medium">
                  Required
                </span>
              )}
            </div>
            {field.description && (
              <p className="text-sm text-md-on-surface-variant mt-1.5 truncate">
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
              className="p-2 text-md-on-surface-variant hover:text-md-on-surface hover-overlay rounded-lg transition-smooth active:scale-95 relative"
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
              className="p-2 text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 rounded-lg transition-smooth active:scale-95"
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Field Form */}
      {isExpanded && (
        <div className="p-5 border-t border-border space-y-4">
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
    </div>
  );
}

export default function ModulesPage() {
  const modules = useModulesStore((state) => state.modules);
  const addModule = useModulesStore((state) => state.addModule);
  const updateModule = useModulesStore((state) => state.updateModule);
  const deleteModule = useModulesStore((state) => state.deleteModule);
  const materials = useMaterialsStore((state) => state.materials);
  const getAllCategories = useCategoriesStore((state) => state.getAllCategories);
  const addCategory = useCategoriesStore((state) => state.addCategory);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [fieldVariablesExpanded, setFieldVariablesExpanded] = useState(true);
  const [materialVariablesExpanded, setMaterialVariablesExpanded] = useState(false);
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
  const [newlyAddedFieldId, setNewlyAddedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Category management state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewFieldValues, setPreviewFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [previewCalculatedCost, setPreviewCalculatedCost] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Autocomplete state
  const [recentlyUsedVariables, setRecentlyUsedVariables] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Array<{
    name: string;
    displayName: string;
    type: 'field' | 'material' | 'property' | 'function' | 'constant';
    description?: string;
  }>>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [currentWord, setCurrentWord] = useState<{ word: string; start: number; end: number; hasDot: boolean; baseWord: string }>({ word: '', start: 0, end: 0, hasDot: false, baseWord: '' });

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
    setNewlyAddedFieldId(newField.id);
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

  // Helper function to check if a material property reference is in the formula
  const isPropertyReferenceInFormula = (materialVar: string, propertyName: string, formula: string): boolean => {
    if (!formula || !materialVar || !propertyName) return false;
    const propertyRef = `${materialVar}.${propertyName}`;
    const regex = new RegExp(`\\b${escapeRegex(propertyRef)}\\b`);
    return regex.test(formula);
  };

  // Get word at cursor position, handling dot notation
  const getWordAtCursor = useCallback((formula: string, cursorPos: number) => {
    if (cursorPos < 0 || cursorPos > formula.length) {
      return { word: '', start: cursorPos, end: cursorPos, hasDot: false, baseWord: '' };
    }

    // Find the start of the current word
    let start = cursorPos;
    while (start > 0 && /[\w.]/.test(formula[start - 1])) {
      start--;
    }

    // Find the end of the current word
    let end = cursorPos;
    while (end < formula.length && /[\w.]/.test(formula[end])) {
      end++;
    }

    const word = formula.substring(start, end);
    const hasDot = word.includes('.');
    
    // If dot notation, extract base word (before dot)
    let baseWord = word;
    if (hasDot) {
      const dotIndex = word.lastIndexOf('.');
      baseWord = word.substring(0, dotIndex);
    }

    return { word, start, end, hasDot, baseWord };
  }, []);

  // Filter suggestions with priority ordering
  const filterSuggestions = useCallback((
    word: string,
    allSuggestions: Array<{
      name: string;
      displayName: string;
      type: 'field' | 'material' | 'property' | 'function' | 'constant';
      description?: string;
    }>,
    recentVariables: string[],
    hasDot: boolean,
    baseWord: string
  ) => {
    if (!word && !hasDot) {
      // If no word, show all suggestions (prioritize recent)
      return allSuggestions
        .sort((a, b) => {
          const aRecent = recentVariables.includes(a.name);
          const bRecent = recentVariables.includes(b.name);
          if (aRecent && !bRecent) return -1;
          if (!aRecent && bRecent) return 1;
          // Functions/constants last
          if (a.type === 'function' || a.type === 'constant') return 1;
          if (b.type === 'function' || b.type === 'constant') return -1;
          return 0;
        })
        .slice(0, 30);
    }

    const searchTerm = word.toLowerCase();
    const exactMatches: typeof allSuggestions = [];
    const startsWithMatches: typeof allSuggestions = [];
    const containsMatches: typeof allSuggestions = [];
    const recentMatches: typeof allSuggestions = [];
    const functionMatches: typeof allSuggestions = [];

    // If dot notation, filter to only properties of the base word
    let candidates = allSuggestions;
    if (hasDot && baseWord) {
      candidates = allSuggestions.filter(s => 
        s.name.startsWith(`${baseWord}.`) || s.name === baseWord
      );
      // If we're typing after the dot, search in property names only
      if (word.includes('.')) {
        const afterDot = word.substring(word.lastIndexOf('.') + 1).toLowerCase();
        if (afterDot) { // Only filter if there's text after the dot
          candidates = candidates.filter(s => {
            if (s.name === baseWord) return true;
            const propName = s.name.substring(s.name.lastIndexOf('.') + 1).toLowerCase();
            return propName.startsWith(afterDot) || propName.includes(afterDot);
          });
        }
      }
    }

    candidates.forEach((suggestion) => {
      const nameLower = suggestion.name.toLowerCase();
      const displayLower = suggestion.displayName.toLowerCase();
      const isRecent = recentVariables.includes(suggestion.name);
      const isFunction = suggestion.type === 'function' || suggestion.type === 'constant';

      // Exact match
      if (nameLower === searchTerm || displayLower === searchTerm) {
        exactMatches.push(suggestion);
      }
      // Starts with
      else if (nameLower.startsWith(searchTerm) || displayLower.startsWith(searchTerm)) {
        if (isRecent && !isFunction) {
          recentMatches.push(suggestion);
        } else {
          startsWithMatches.push(suggestion);
        }
      }
      // Contains (partial/fuzzy)
      else if (nameLower.includes(searchTerm) || displayLower.includes(searchTerm)) {
        if (isRecent && !isFunction) {
          recentMatches.push(suggestion);
        } else if (isFunction) {
          functionMatches.push(suggestion);
        } else {
          containsMatches.push(suggestion);
        }
      }
    });

    // Combine in priority order: exact → starts-with → recent → contains → functions
    const result = [
      ...exactMatches,
      ...startsWithMatches,
      ...recentMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s)),
      ...containsMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !recentMatches.includes(s)),
      ...functionMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !containsMatches.includes(s) && !recentMatches.includes(s)),
    ];

    return result.slice(0, 30);
  }, []);

  // Insert suggestion with dot notation handling
  const insertSuggestion = useCallback((suggestion: typeof collectAutocompleteCandidates[0], wordInfo: { word: string; start: number; end: number; hasDot: boolean; baseWord: string }) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    let variableToInsert = suggestion.name;
    
    // Handle dot notation: if typing "mat_plank." and selecting "width", insert just "width"
    if (wordInfo.hasDot && wordInfo.baseWord) {
      if (suggestion.name.startsWith(`${wordInfo.baseWord}.`)) {
        // Extract property name only
        variableToInsert = suggestion.name.substring(wordInfo.baseWord.length + 1);
      } else if (suggestion.name === wordInfo.baseWord) {
        // Keep the base word
        variableToInsert = wordInfo.baseWord;
      }
    }

    const before = formData.formula.substring(0, wordInfo.start);
    const after = formData.formula.substring(wordInfo.end);
    
    // Determine if we need spaces around the variable
    const charBefore = wordInfo.start > 0 ? formData.formula[wordInfo.start - 1] : '';
    const needsSpaceBefore = wordInfo.start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '\t' && 
      !/[+\-*/(]/.test(charBefore);
    
    const charAfter = wordInfo.end < formData.formula.length ? formData.formula[wordInfo.end] : '';
    const needsSpaceAfter = wordInfo.end < formData.formula.length && 
      charAfter !== ' ' && 
      charAfter !== '\t' && 
      !/[+\-*/)]/.test(charAfter);
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    
    // If we had dot notation and are inserting property, don't add space before
    const finalBefore = wordInfo.hasDot && variableToInsert !== wordInfo.baseWord ? '' : spaceBefore;
    
    const insertedText = `${finalBefore}${variableToInsert}${spaceAfter}`;
    const newValue = before + insertedText + after;
    const newCursorPos = wordInfo.start + insertedText.length;
    
    setFormData({ ...formData, formula: newValue });
    
    // Track recently used variable
    setRecentlyUsedVariables((prev) => {
      const updated = [suggestion.name, ...prev.filter(v => v !== suggestion.name)].slice(0, 15);
      return updated;
    });
    
    setIsAutocompleteOpen(false);
    setSelectedSuggestionIndex(-1);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [formData, recentlyUsedVariables]);

  // Placeholder - will be replaced after collectAutocompleteCandidates is defined
  const updateAutocompleteSuggestions = useCallback(() => {
    // This will be replaced by updateAutocompleteSuggestionsFinal
  }, []);

  // Handle keyboard navigation for autocomplete
  const handleAutocompleteKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isAutocompleteOpen || autocompleteSuggestions.length === 0) {
      return false; // Let event propagate normally
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        return true;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
        );
        return true;
      
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        const index = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        if (autocompleteSuggestions[index]) {
          insertSuggestion(autocompleteSuggestions[index], currentWord);
        }
        return true;
      
      case 'Escape':
        e.preventDefault();
        setIsAutocompleteOpen(false);
        setSelectedSuggestionIndex(-1);
        return true;
      
      case 'ArrowLeft':
      case 'ArrowRight':
        setIsAutocompleteOpen(false);
        return false; // Let navigation happen
      
      default:
        return false; // Let other keys through
    }
  }, [isAutocompleteOpen, autocompleteSuggestions, selectedSuggestionIndex, currentWord, insertSuggestion]);

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
    
    // Track recently used variable
    setRecentlyUsedVariables((prev) => {
      const updated = [variableName, ...prev.filter(v => v !== variableName)].slice(0, 15);
      return updated;
    });
    
    // Set cursor position after React updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertOperatorAtCursor = (operator: string) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = formData.formula;
    
    // Insert operator at cursor position
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    
    // Add space before operator if needed
    const charBefore = start > 0 ? currentValue[start - 1] : '';
    const needsSpaceBefore = start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '(' &&
      charBefore !== '' &&
      !['+', '-', '*', '/', '(', '='].includes(charBefore);
    
    // Add space after operator if needed (except for parentheses and functions)
    const charAfter = end < currentValue.length ? currentValue[end] : '';
    const needsSpaceAfter = end < currentValue.length && 
      charAfter !== ' ' && 
      charAfter !== ')' &&
      charAfter !== '' &&
      !['+', '-', '*', '/', ')', '='].includes(charAfter) &&
      !operator.includes('(') && !operator.includes(')');
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    
    const newValue = before + spaceBefore + operator + spaceAfter + after;
    
    setFormData({ ...formData, formula: newValue });
    
    // Set cursor position after inserted operator
    setTimeout(() => {
      const newPosition = start + spaceBefore.length + operator.length + spaceAfter.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const validateFormulaInput = useCallback((formula: string) => {
    if (!formula.trim()) {
      setFormulaValidation({ valid: false });
      return;
    }

    const availableVars = fields.map((f) => f.variableName).filter(Boolean);
    // Pass field definitions for validation (needed to identify material fields)
    const fieldDefinitions = fields.map(f => ({
      variableName: f.variableName,
      type: f.type,
      materialCategory: f.materialCategory,
    }));
    const validation = validateFormula(formula, availableVars, materials, fieldDefinitions);

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
              case 'material':
                // For material fields, select first available material in category (or any material)
                let candidateMaterials = materials;
                if (field.materialCategory && field.materialCategory.trim()) {
                  candidateMaterials = materials.filter(m => m.category === field.materialCategory);
                }
                if (candidateMaterials.length > 0) {
                  defaultValues[field.variableName] = candidateMaterials[0].variableName;
                } else {
                  // No material available - use empty string (will cause error if used in formula)
                  defaultValues[field.variableName] = '';
                }
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
  }, [fields, materials, setFormulaValidation]);

  useEffect(() => {
    if (formData.formula) {
      validateFormulaInput(formData.formula);
    } else {
      setFormulaValidation({ valid: false });
    }
  }, [formData.formula, fields, materials, validateFormulaInput]);

  // Calculate preview cost in real-time
  useEffect(() => {
    if (!showPreview || !formData.formula || !formulaValidation.valid) {
      setPreviewCalculatedCost(0);
      setPreviewError(null);
      return;
    }

    try {
      // Check if required fields are missing
      const missingFields = fields
        .filter(f => f.required && f.variableName && (
          previewFieldValues[f.variableName] === undefined ||
          previewFieldValues[f.variableName] === '' ||
          previewFieldValues[f.variableName] === null
        ))
        .map(f => f.label);

      if (missingFields.length > 0) {
        setPreviewError('⚠️ Cannot calculate yet — missing inputs.');
        setPreviewCalculatedCost(0);
        return;
      }

      // Check if material is needed for property formulas
      const availableVars = fields.map((f) => f.variableName).filter(Boolean);
      const formulaVars = analyzeFormulaVariables(formData.formula, availableVars, materials, fields.map(f => ({
        variableName: f.variableName,
        type: f.type,
        materialCategory: f.materialCategory,
      })));
      const materialFields = fields.filter(f => f.type === 'material');
      const hasMaterialProperties = formulaVars.materialPropertyRefs.length > 0;
      
      if (hasMaterialProperties) {
        const materialVarsInFormula = new Set(formulaVars.materialPropertyRefs.map(ref => ref.materialVar));
        const missingMaterials = Array.from(materialVarsInFormula).filter(matVar => {
          // Check if any material field has this variable name set
          return !materialFields.some(f => previewFieldValues[f.variableName] === matVar);
        });

        if (missingMaterials.length > 0) {
          setPreviewError('⚠️ Select a material to continue.');
          setPreviewCalculatedCost(0);
          return;
        }
      }

      const result = evaluateFormula(formData.formula, {
        fieldValues: previewFieldValues,
        materials,
        fields: fields.map(f => ({
          variableName: f.variableName,
          type: f.type,
          materialCategory: f.materialCategory,
        })),
      });
      setPreviewCalculatedCost(result);
      setPreviewError(null);
    } catch (error: any) {
      // Calculation failed - show friendly error
      setPreviewError('⚠️ Cannot calculate yet — missing inputs.');
      setPreviewCalculatedCost(0);
    }
  }, [showPreview, formData.formula, previewFieldValues, materials, fields, formulaValidation.valid]);

  // Auto-scroll to newly added field
  useEffect(() => {
    if (newlyAddedFieldId) {
      const fieldElement = fieldRefs.current.get(newlyAddedFieldId);
      if (fieldElement) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          // Calculate the position to scroll to, accounting for both sticky elements
          const elementRect = fieldElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Find the bottom action bar height (fixed at bottom)
          const bottomActionBar = document.querySelector('[data-bottom-action-bar]') as HTMLElement;
          const bottomActionBarHeight = bottomActionBar?.offsetHeight || 72; // Default ~72px (py-4 = 16px top + 16px bottom + button height ~40px)
          
          // Total space needed at bottom: action bar + padding
          const desiredBottomSpace = bottomActionBarHeight + 24; // Extra padding
          
          // Calculate how much we need to scroll
          const currentScrollY = window.scrollY;
          const elementTop = elementRect.top + currentScrollY;
          const elementBottom = elementTop + elementRect.height;
          
          // Target: element should be visible with both buttons visible at bottom
          const targetScrollY = elementTop - (viewportHeight - elementRect.height - desiredBottomSpace);
          
          // Only scroll if the element is not already in a good position
          if (elementRect.bottom > viewportHeight - desiredBottomSpace || elementRect.top < 0) {
            window.scrollTo({
              top: Math.max(0, targetScrollY),
              behavior: 'smooth'
            });
          }
          
          setNewlyAddedFieldId(null);
        }, 100);
      }
    }
  }, [newlyAddedFieldId, fields]);

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
        materialCategory: field?.materialCategory,
      };
    });

  // Get available properties for material fields
  const getMaterialFieldProperties = (fieldVar: string) => {
    const field = fields.find(f => f.variableName === fieldVar);
    if (!field || field.type !== 'material') {
      return [];
    }
    
    // Get materials in the field's category (if specified)
    let candidateMaterials = materials;
    if (field.materialCategory && field.materialCategory.trim()) {
      candidateMaterials = materials.filter(m => m.category === field.materialCategory);
    }
    
    // Collect all unique properties from candidate materials
    const propertyMap = new Map<string, { name: string; unit?: string; unitSymbol?: string; type: string }>();
    candidateMaterials.forEach(material => {
      if (material.properties) {
        material.properties.forEach(prop => {
          if (!propertyMap.has(prop.name)) {
            propertyMap.set(prop.name, {
              name: prop.name,
              unit: prop.unit,
              unitSymbol: prop.unitSymbol,
              type: prop.type,
            });
          }
        });
      }
    });
    
    return Array.from(propertyMap.values());
  };
  
  // Calculate used fields for progress counter
  // Note: In formula builder, ALL fields are available (must be in formula)
  // The 'required' flag means "requires user input when using the module"
  const allFields = availableFieldVariables;
  const usedFields = allFields.filter(
    (v) => isVariableInFormula(v.name, formData.formula)
  ).length;
  
  // Keep track of required fields separately for visual indicators (green checkmarks, red borders)
  // These indicate fields that require user input when using the module
  const requiredFields = availableFieldVariables.filter((v) => v.required);

  // Show all materials as available variables in formula builder
  const availableMaterialVariables = materials.map((m) => ({
    name: m.variableName,
    label: m.name,
    price: m.price,
    unit: m.unit,
    properties: m.properties || [],
  }));

  // Collect all available autocomplete candidates
  const collectAutocompleteCandidates = useMemo(() => {
    const candidates: Array<{
      name: string;
      displayName: string;
      type: 'field' | 'material' | 'property' | 'function' | 'constant';
      description?: string;
    }> = [];

    // Field variables
    availableFieldVariables.forEach((fieldVar) => {
      candidates.push({
        name: fieldVar.name,
        displayName: fieldVar.name,
        type: 'field',
        description: fieldVar.label !== fieldVar.name ? fieldVar.label : undefined,
      });

      // If it's a material field, add its properties
      if (fieldVar.type === 'material') {
        const fieldProperties = getMaterialFieldProperties(fieldVar.name);
        fieldProperties.forEach((prop) => {
          const unitDisplay = prop.unitSymbol || prop.unit;
          candidates.push({
            name: `${fieldVar.name}.${prop.name}`,
            displayName: `${fieldVar.name}.${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''}`,
            type: 'property',
            description: prop.name,
          });
        });
      }
    });

    // Material variables
    availableMaterialVariables.forEach((mat) => {
      candidates.push({
        name: mat.name,
        displayName: mat.name,
        type: 'material',
        description: mat.label,
      });

      // Material properties
      mat.properties.forEach((prop) => {
        const unitDisplay = prop.unitSymbol || prop.unit;
        candidates.push({
          name: `${mat.name}.${prop.name}`,
          displayName: `${mat.name}.${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''}`,
          type: 'property',
          description: prop.name,
        });
      });
    });

    // Functions
    const functions = [
      { name: 'sqrt', displayName: 'sqrt()', description: 'Square root' },
      { name: 'round', displayName: 'round()', description: 'Round to nearest integer' },
      { name: 'ceil', displayName: 'ceil()', description: 'Round up' },
      { name: 'floor', displayName: 'floor()', description: 'Round down' },
      { name: 'abs', displayName: 'abs()', description: 'Absolute value' },
      { name: 'max', displayName: 'max()', description: 'Maximum value' },
      { name: 'min', displayName: 'min()', description: 'Minimum value' },
    ];
    functions.forEach((fn) => {
      candidates.push({
        name: fn.name,
        displayName: fn.displayName,
        type: 'function',
        description: fn.description,
      });
    });

    // Constants
    const constants = [
      { name: 'pi', displayName: 'pi', description: 'Pi (3.14159...)' },
      { name: 'e', displayName: 'e', description: 'Euler\'s number (2.71828...)' },
    ];
    constants.forEach((const_) => {
      candidates.push({
        name: const_.name,
        displayName: const_.displayName,
        type: 'constant',
        description: const_.description,
      });
    });

    return candidates;
  }, [availableFieldVariables, availableMaterialVariables, materials, fields, getMaterialFieldProperties]);

  // Update autocomplete suggestions - redefined after collectAutocompleteCandidates
  const updateAutocompleteSuggestionsFinal = useCallback(() => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) {
      setIsAutocompleteOpen(false);
      return;
    }

    // Read current value directly from textarea to get the latest typed character
    const currentFormula = textarea.value;
    const cursorPos = textarea.selectionStart;
    const wordInfo = getWordAtCursor(currentFormula, cursorPos);
    
    setCurrentWord(wordInfo);

    // Only show suggestions if there's actual input (word being typed)
    // Don't show suggestions on empty focus/click
    if (!wordInfo.word && !wordInfo.hasDot) {
      setIsAutocompleteOpen(false);
      return;
    }

    // Filter suggestions
    const filtered = filterSuggestions(
      wordInfo.word,
      collectAutocompleteCandidates,
      recentlyUsedVariables,
      wordInfo.hasDot,
      wordInfo.baseWord
    );

    if (filtered.length > 0) {
      setAutocompleteSuggestions(filtered);
      setSelectedSuggestionIndex(-1);
      
      // Calculate cursor position accurately using text measurement up to cursor
      const rect = textarea.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textarea);
      
      // Get text before cursor to measure exact cursor position
      const textBeforeCursor = currentFormula.substring(0, cursorPos);
      
      // Split to get current line and line number
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      const lineNumber = lines.length - 1;
      
      // Create a temporary element to measure text width up to cursor position
      const measureDiv = document.createElement('div');
      measureDiv.style.position = 'fixed'; // Use fixed to match dropdown positioning
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.whiteSpace = 'pre-wrap';
      measureDiv.style.wordWrap = 'break-word';
      measureDiv.style.font = computedStyle.font;
      measureDiv.style.fontFamily = computedStyle.fontFamily;
      measureDiv.style.fontSize = computedStyle.fontSize;
      measureDiv.style.fontWeight = computedStyle.fontWeight;
      measureDiv.style.lineHeight = computedStyle.lineHeight;
      measureDiv.style.letterSpacing = computedStyle.letterSpacing;
      measureDiv.style.padding = computedStyle.padding;
      measureDiv.style.width = `${rect.width}px`;
      measureDiv.style.boxSizing = computedStyle.boxSizing;
      measureDiv.style.border = computedStyle.border;
      measureDiv.style.borderWidth = computedStyle.borderWidth;
      // Position at textarea location
      measureDiv.style.top = `${rect.top}px`;
      measureDiv.style.left = `${rect.left}px`;
      
      // Create a span to measure only the text up to cursor on current line
      const textSpan = document.createElement('span');
      textSpan.textContent = currentLine;
      measureDiv.appendChild(textSpan);
      
      // Create a cursor marker span
      const cursorSpan = document.createElement('span');
      cursorSpan.textContent = '|';
      measureDiv.appendChild(cursorSpan);
      
      document.body.appendChild(measureDiv);
      
      try {
        // Get the position of the cursor span (viewport coordinates)
        const cursorSpanRect = cursorSpan.getBoundingClientRect();
        
        // Position dropdown at cursor position
        const top = cursorSpanRect.bottom + 2; // Small offset below cursor
        const left = cursorSpanRect.left;
        
        // Validate positions are numbers
        if (isNaN(top) || isNaN(left) || top < 0 || left < 0) {
          throw new Error('Invalid cursor position');
        }
        
        // Use fixed positioning (viewport coordinates, no scroll offset needed)
        setAutocompletePosition({ top, left });
        setIsAutocompleteOpen(true);
      } catch (error) {
        // Fallback to simple positioning if measurement fails
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        
        // Simple fallback: position below textarea
        const top = rect.bottom + 2;
        const left = rect.left + paddingLeft;
        
        setAutocompletePosition({ top, left });
        setIsAutocompleteOpen(true);
      } finally {
        document.body.removeChild(measureDiv);
      }
    } else {
      setIsAutocompleteOpen(false);
    }
  }, [formData.formula, getWordAtCursor, filterSuggestions, collectAutocompleteCandidates, recentlyUsedVariables]);

  // Update autocomplete position on scroll/resize
  useEffect(() => {
    if (!isAutocompleteOpen) return;
    
    const handleScroll = () => {
      // Use requestAnimationFrame to debounce and ensure smooth updates
      requestAnimationFrame(() => {
        updateAutocompleteSuggestionsFinal();
      });
    };
    
    // Listen to scroll on window and all scrollable parents (capture phase)
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isAutocompleteOpen, updateAutocompleteSuggestionsFinal]);

  // Show workspace if editing
  if (editingModuleId) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            {editingModuleId === 'new' ? 'Create Module' : 'Edit Module'}
          </h1>
          <p className="text-lg text-md-on-surface-variant">Define → Configure → Calculate</p>
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
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getAllCategories().map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                          formData.category === cat
                            ? 'bg-md-primary text-md-primary-foreground elevation-1'
                            : 'bg-md-surface-variant text-md-on-surface-variant hover:bg-md-surface-variant/80 hover:text-md-on-surface border border-border'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    {!showAddCategory && (
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(true)}
                        className="px-4 py-2.5 rounded-full text-sm font-medium transition-all bg-md-surface-variant text-md-on-surface-variant hover:bg-md-surface-variant/80 hover:text-md-on-surface border border-border border-dashed"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add Category
                      </button>
                    )}
                  </div>
                  {showAddCategory && (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategoryName.trim()) {
                              addCategory(newCategoryName.trim());
                              setFormData({ ...formData, category: newCategoryName.trim() });
                              setNewCategoryName('');
                              setShowAddCategory(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            addCategory(newCategoryName.trim());
                            setFormData({ ...formData, category: newCategoryName.trim() });
                            setNewCategoryName('');
                            setShowAddCategory(false);
                          }
                        }}
                        disabled={!newCategoryName.trim()}
                        size="sm"
                        className="rounded-full"
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddCategory(false);
                          setNewCategoryName('');
                        }}
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {formData.category && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: '' })}
                      className="mt-2 text-xs text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                    >
                      Clear category
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* INPUT FIELDS MANAGER */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Input Fields</h2>
              </div>

              {fields.length === 0 ? (
                <Card>
                  <div className="text-center py-6">
                    <p className="text-sm text-md-on-surface-variant mb-3">
                      Fields define the inputs required for your calculation formula. Each field becomes a variable you can use in your formula.
                    </p>
                    <Button size="sm" onClick={addField} className="rounded-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Field
                    </Button>
                  </div>
                </Card>
              ) : (
                <>
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
                              fieldRef={(el) => {
                                if (el) {
                                  fieldRefs.current.set(field.id, el);
                                } else {
                                  fieldRefs.current.delete(field.id);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                  
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - FORMULA BUILDER */}
          <div className="lg:col-span-1">
            <Card title="Formula Builder" elevation={2} className="sticky top-[88px]">
              <div className="space-y-6">
                {/* Available Variables */}
                {availableFieldVariables.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setFieldVariablesExpanded(!fieldVariablesExpanded)}
                      className="flex items-center justify-between w-full mb-3 group"
                      aria-expanded={fieldVariablesExpanded}
                    >
                      <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-md-on-surface">Field Variables</h4>
                      {allFields.length > 0 && (
                        <span className="text-xs text-md-on-surface-variant">
                          {usedFields}/{allFields.length} fields
                        </span>
                      )}
                    </div>
                      {fieldVariablesExpanded ? (
                        <ChevronDown className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
                      )}
                    </button>
                    {fieldVariablesExpanded && (
                      <div 
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))'
                        }}
                      >
                      {availableFieldVariables.map((varInfo) => {
                        const isInFormula = isVariableInFormula(varInfo.name, formData.formula);
                        const showCheckmark = isInFormula;
                        const isMaterialField = varInfo.type === 'material';
                        const fieldProperties = isMaterialField ? getMaterialFieldProperties(varInfo.name) : [];
                        const hasProperties = fieldProperties.length > 0;
                        const isExpanded = expandedField === varInfo.name;

                        const handleToggleExpand = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          setExpandedField(isExpanded ? null : varInfo.name);
                        };

                        const handleFieldClick = (e: React.MouseEvent) => {
                          if (!hasProperties) {
                            insertVariableAtCursor(varInfo.name);
                          } else {
                            // If expandable, clicking the button inserts the variable
                            // Expansion is handled by the chevron button
                            insertVariableAtCursor(varInfo.name);
                          }
                        };
                        
                        return (
                          <div key={varInfo.name} className="space-y-2 min-w-0">
                            <button
                              type="button"
                              onClick={handleFieldClick}
                              aria-label={`Insert variable ${varInfo.name} (${varInfo.label}, ${varInfo.type})${showCheckmark ? ' - already in formula' : ''}`}
                              title={`${varInfo.label} (${varInfo.type})${isMaterialField ? ' - unit price' : ''}`}
                              className={cn(
                                "w-full px-3 py-1.5 border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:ring-offset-2 focus:ring-offset-md-surface active:scale-95 elevation-1 hover-glow flex items-center gap-1.5 min-w-0 relative",
                                showCheckmark 
                                  ? "border-success bg-success hover:bg-success/90 text-success-foreground" 
                                  : "bg-md-primary text-md-primary-foreground hover:bg-md-surface-variant hover:text-md-primary border-accent hover:border-border"
                              )}
                            >
                              {showCheckmark && (
                                <CheckCircle2 className="h-3 w-3 text-success-foreground shrink-0" aria-hidden="true" />
                              )}
                              <span className="truncate min-w-0 flex-1 text-center">{varInfo.name}</span>
                              {isMaterialField && (
                                <span className="text-[10px] opacity-75 shrink-0">(price)</span>
                              )}
                              {hasProperties && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleExpand(e);
                                  }}
                                  className="py-0.5 pl-2 pr-2 dark:text-black text-white hover:opacity-80 transition-opacity shrink-0 -mx-3"
                                  aria-label={isExpanded ? `Collapse ${varInfo.name}` : `Expand ${varInfo.name}`}
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                              )}
                            </button>
                            {hasProperties && isExpanded && (
                              <div className="space-y-1.5 pt-1.5 ml-4">
                                  {fieldProperties.map((prop) => {
                                    const propertyRef = `${varInfo.name}.${prop.name}`;
                                    const isPropertyInFormula = isPropertyReferenceInFormula(varInfo.name, prop.name, formData.formula);
                                  const unitDisplay = prop.unitSymbol || prop.unit || '';
                                  const propertyLabel = unitDisplay ? `${prop.name} (${unitDisplay})` : prop.name;
                                  
                                    return (
                                      <button
                                        key={prop.name}
                                        type="button"
                                        onClick={() => insertVariableAtCursor(propertyRef)}
                                      aria-label={`Insert property ${propertyRef} (${prop.name}${unitDisplay ? `, ${unitDisplay}` : ''})`}
                                      title={`${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''} (${prop.type})`}
                                        className={cn(
                                        "w-full px-3 py-1.5 border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:ring-offset-2 focus:ring-offset-md-surface active:scale-95 elevation-1 hover-glow flex items-center gap-1.5 min-w-0 relative",
                                          isPropertyInFormula
                                            ? "border-success bg-success hover:bg-success/90 text-success-foreground"
                                          : "bg-md-primary text-md-primary-foreground hover:bg-md-surface-variant hover:text-md-primary border-accent hover:border-border"
                                        )}
                                      >
                                        {isPropertyInFormula && (
                                        <CheckCircle2 className="h-3 w-3 text-success-foreground shrink-0" aria-hidden="true" />
                                        )}
                                      <span className="truncate min-w-0 flex-1 text-center">{propertyLabel}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                )}

                {availableMaterialVariables.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setMaterialVariablesExpanded(!materialVariablesExpanded)}
                      className="flex items-center justify-between w-full mb-3 group"
                      aria-expanded={materialVariablesExpanded}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-md-on-surface">Material Variables</h4>
                        <span className="text-xs text-md-on-surface-variant">
                          {availableMaterialVariables.length} {availableMaterialVariables.length === 1 ? 'material' : 'materials'}
                        </span>
                      </div>
                      {materialVariablesExpanded ? (
                        <ChevronDown className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
                      )}
                    </button>
                    {!materialVariablesExpanded && (
                      <p className="text-xs text-md-on-surface-variant mb-3">
                        Click to expand and access material variables for your formula.
                      </p>
                    )}
                    {materialVariablesExpanded && (
                      <div 
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))'
                        }}
                      >
                      {availableMaterialVariables.map((mat) => {
                        const isMaterialInFormula = isVariableInFormula(mat.name, formData.formula);
                        const hasProperties = mat.properties && mat.properties.length > 0;
                        const isExpanded = expandedMaterial === mat.name;

                        const handleToggleExpand = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          setExpandedMaterial(isExpanded ? null : mat.name);
                        };

                        const handleMaterialClick = (e: React.MouseEvent) => {
                          if (!hasProperties) {
                            insertVariableAtCursor(mat.name);
                          } else {
                            // If expandable, clicking the button inserts the variable
                            // Expansion is handled by the chevron button
                            insertVariableAtCursor(mat.name);
                          }
                        };

                        return (
                          <div key={mat.name} className="space-y-2 min-w-0">
                            <button
                              type="button"
                              onClick={handleMaterialClick}
                              aria-label={`Insert material variable ${mat.name} (${mat.label} - $${mat.price.toFixed(2)} per ${mat.unit})`}
                              title={`${mat.label} - $${mat.price.toFixed(2)}/${mat.unit}`}
                              className={cn(
                                "w-full px-3 py-1.5 border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:ring-offset-2 focus:ring-offset-md-surface active:scale-95 elevation-1 hover-glow flex items-center gap-1.5 min-w-0 relative",
                                isMaterialInFormula
                                  ? "border-success bg-success hover:bg-success/90 text-success-foreground"
                                  : "bg-md-primary text-md-primary-foreground hover:bg-md-surface-variant hover:text-md-primary border-accent hover:border-border"
                              )}
                            >
                              {isMaterialInFormula && (
                                <CheckCircle2 className="h-3 w-3 text-success-foreground shrink-0" aria-hidden="true" />
                              )}
                              <span className="truncate min-w-0 flex-1 text-center">{mat.name}</span>
                              {hasProperties && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleExpand(e);
                                  }}
                                  className="py-0.5 pl-2 pr-2 dark:text-black text-white hover:opacity-80 transition-opacity shrink-0 -mx-3"
                                  aria-label={isExpanded ? `Collapse ${mat.name}` : `Expand ${mat.name}`}
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                              )}
                            </button>
                            {hasProperties && isExpanded && (
                              <div className="space-y-1.5 pt-1.5 ml-4">
                                  {mat.properties.map((prop) => {
                                    const propertyRef = `${mat.name}.${prop.name}`;
                                    const isPropertyInFormula = isPropertyReferenceInFormula(mat.name, prop.name, formData.formula);
                                  const unitDisplay = prop.unitSymbol || prop.unit || '';
                                  const propertyLabel = unitDisplay ? `${prop.name} (${unitDisplay})` : prop.name;
                                  
                                    return (
                                      <button
                                        key={prop.id}
                                        type="button"
                                        onClick={() => insertVariableAtCursor(propertyRef)}
                                      aria-label={`Insert property ${propertyRef} (${prop.name}${unitDisplay ? `, ${unitDisplay}` : ''})`}
                                      title={`${prop.name}${unitDisplay ? ` (${unitDisplay})` : ''} (${prop.type})`}
                                        className={cn(
                                        "w-full px-3 py-1.5 border rounded-full text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:ring-offset-2 focus:ring-offset-md-surface active:scale-95 elevation-1 hover-glow flex items-center gap-1.5 min-w-0 relative",
                                          isPropertyInFormula
                                            ? "border-success bg-success hover:bg-success/90 text-success-foreground"
                                          : "bg-md-surface-variant text-foreground hover:bg-md-surface-variant/80 border border-border hover:border-accent/50"
                                        )}
                                      >
                                        {isPropertyInFormula && (
                                        <CheckCircle2 className="h-3 w-3 text-success-foreground shrink-0" aria-hidden="true" />
                                        )}
                                      <span className="truncate min-w-0 flex-1 text-center">{propertyLabel}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                )}

                {availableFieldVariables.length === 0 && availableMaterialVariables.length === 0 && (
                  <div className="text-center py-4 text-md-on-surface-variant text-sm">
                    <p>Add fields or materials to use variables in your formula</p>
                  </div>
                )}

                {/* Formula Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="formula-input" className="text-sm font-semibold text-md-on-surface">Formula</label>
                    {formData.formula && (
                      <div className="flex items-center space-x-1" role="status" aria-live="polite">
                        {formulaValidation.valid ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-md-primary" aria-hidden="true" />
                            <span className="text-xs text-md-primary font-medium">Valid</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-md-error" aria-hidden="true" />
                            <span className="text-xs text-md-error font-medium">Invalid</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                  <Textarea
                    ref={formulaTextareaRef}
                    id="formula-input"
                    value={formData.formula}
                    onChange={(e) => {
                      setFormData({ ...formData, formula: e.target.value });
                        // Update autocomplete immediately with the new value
                        // Use requestAnimationFrame to ensure DOM is updated
                        requestAnimationFrame(() => {
                          updateAutocompleteSuggestionsFinal();
                        });
                      }}
                      onKeyDown={(e) => {
                        // Filter out modifier keys and non-character inputs
                        const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
                        const isNonCharacterKey = [
                          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                          'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Enter', 'Escape',
                          'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock'
                        ].includes(e.key);
                        
                        // Handle autocomplete navigation first
                        const handled = handleAutocompleteKeyDown(e);
                        if (handled) {
                          return; // Autocomplete handled the key
                        }
                        
                        // Only update suggestions for character input (not modifiers or navigation)
                        if (!isModifierKey && !isNonCharacterKey && e.key.length === 1) {
                          // Character input - update suggestions after the character is inserted
                          requestAnimationFrame(() => {
                            updateAutocompleteSuggestionsFinal();
                          });
                        } else if (isNonCharacterKey && ['Backspace', 'Delete'].includes(e.key)) {
                          // Backspace/Delete - update suggestions after deletion
                          requestAnimationFrame(() => {
                            updateAutocompleteSuggestionsFinal();
                          });
                        }
                      }}
                      onBlur={() => {
                        // Delay closing to allow clicks on suggestions
                        setTimeout(() => setIsAutocompleteOpen(false), 200);
                    }}
                    error={errors.formula || formulaValidation.error}
                    placeholder="e.g., width * height * mat_plank.length * quantity"
                    rows={6}
                    className={`font-mono text-sm ${
                      formulaValidation.valid && formData.formula
                        ? 'border-success/50 focus:ring-success/50'
                        : formData.formula && !formulaValidation.valid
                        ? 'border-destructive/50 focus:ring-destructive/50'
                        : ''
                    }`}
                  />
                    {/* Autocomplete Dropdown */}
                    {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
                      <div
                        className="fixed z-50 bg-md-surface-container border border-md-outline rounded-lg elevation-4 max-h-64 overflow-y-auto"
                        style={{
                          top: `${autocompletePosition.top}px`,
                          left: `${autocompletePosition.left}px`,
                          minWidth: '280px',
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                      >
                        {autocompleteSuggestions.slice(0, 8).map((suggestion, index) => {
                          const isSelected = index === selectedSuggestionIndex;
                          const isRecent = recentlyUsedVariables.includes(suggestion.name);
                          
                          return (
                            <button
                              key={`${suggestion.name}-${index}`}
                              type="button"
                              onClick={() => {
                                insertSuggestion(suggestion, currentWord);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(index)}
                              className={cn(
                                "w-full px-3 py-2 text-left flex items-center gap-2 transition-colors",
                                isSelected
                                  ? "bg-md-primary text-md-primary-foreground"
                                  : "hover:bg-md-surface-variant"
                              )}
                            >
                              <code className="text-xs font-mono flex-1">{suggestion.displayName}</code>
                              {isRecent && (
                                <span className="text-xs text-md-on-surface-variant">●</span>
                              )}
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                suggestion.type === 'field' && "bg-md-primary/10 text-md-primary",
                                suggestion.type === 'material' && "bg-success/10 text-success",
                                suggestion.type === 'property' && "bg-md-primary-muted/10 text-md-primary-muted",
                                suggestion.type === 'function' && "bg-warning/10 text-warning",
                                suggestion.type === 'constant' && "bg-warning/10 text-warning"
                              )}>
                                {suggestion.type}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {formulaValidation.valid && formulaValidation.preview !== undefined && (
                    <div className="mt-2 p-3" role="status" aria-live="polite">
                      <div className="flex items-center space-x-2">
                        <Calculator className="h-4 w-4 text-md-primary" aria-hidden="true" />
                        <span className="text-xs text-md-on-surface-variant">Preview (with defaults):</span>
                        <span className="text-sm font-bold text-success">
                          ${formulaValidation.preview.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formula Debug Panel */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-md-on-surface-variant hover:text-md-on-surface transition-colors">
                    Formula debug (detected variables)
                  </summary>
                  <div className="mt-3 space-y-3 p-3 bg-md-surface-variant/30 rounded-lg border border-border">
                    {(() => {
                      const debugInfo = analyzeFormulaVariables(
                        formData.formula,
                        availableFieldVariables.map(v => v.name),
                        materials,
                        fields.map(f => ({
                          variableName: f.variableName,
                          type: f.type,
                          materialCategory: f.materialCategory,
                        }))
                      );
                      
                      return (
                        <>
                          {/* Standalone Variables */}
                          <div>
                            <h5 className="text-xs font-semibold text-md-on-surface mb-1.5">
                              Standalone Variables ({debugInfo.variables.length})
                            </h5>
                            {debugInfo.variables.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {debugInfo.variables.map((varName: string) => (
                                  <code
                                    key={varName}
                                    className="px-2 py-1 bg-background border border-border rounded text-xs font-mono text-md-primary"
                                  >
                                    {varName}
                                  </code>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-md-on-surface-variant italic">None</p>
                            )}
                          </div>

                          {/* Unknown Variables */}
                          <div>
                            <h5 className="text-xs font-semibold text-md-on-surface mb-1.5">
                              Unknown Variables ({debugInfo.unknownVariables.length})
                            </h5>
                            {debugInfo.unknownVariables.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {debugInfo.unknownVariables.map((varName: string) => (
                                  <code
                                    key={varName}
                                    className="px-2 py-1 bg-md-error/10 border border-destructive/30 rounded text-xs font-mono text-md-error"
                                  >
                                    {varName}
                                  </code>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-md-on-surface-variant italic">None</p>
                            )}
                          </div>

                          {/* Field Property References */}
                          <div>
                            <h5 className="text-xs font-semibold text-md-on-surface mb-1.5">
                              Field Property References ({debugInfo.fieldPropertyRefs.length})
                            </h5>
                            {debugInfo.fieldPropertyRefs.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {debugInfo.fieldPropertyRefs.map((ref: { full: string; fieldVar: string; property: string }, idx: number) => (
                                  <code
                                    key={`${ref.full}-${idx}`}
                                    className="px-2 py-1 bg-background border border-border rounded text-xs font-mono text-md-primary"
                                    title={`${ref.fieldVar}.${ref.property}`}
                                  >
                                    {ref.full}
                                  </code>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-md-on-surface-variant italic">None</p>
                            )}
                          </div>

                          {/* Material Property References */}
                          <div>
                            <h5 className="text-xs font-semibold text-md-on-surface mb-1.5">
                              Material Property References ({debugInfo.materialPropertyRefs.length})
                            </h5>
                            {debugInfo.materialPropertyRefs.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {debugInfo.materialPropertyRefs.map((ref: { full: string; materialVar: string; property: string }, idx: number) => (
                                  <code
                                    key={`${ref.full}-${idx}`}
                                    className="px-2 py-1 bg-background border border-border rounded text-xs font-mono text-md-primary"
                                    title={`${ref.materialVar}.${ref.property}`}
                                  >
                                    {ref.full}
                                  </code>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-md-on-surface-variant italic">None</p>
                            )}
                          </div>

                          {/* Math Functions (for reference) */}
                          {debugInfo.mathFunctions.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-md-on-surface mb-1.5">
                                Math Functions ({debugInfo.mathFunctions.length})
                              </h5>
                              <div className="flex flex-wrap gap-1.5">
                                {debugInfo.mathFunctions.map((funcName: string) => (
                                  <code
                                    key={funcName}
                                    className="px-2 py-1 bg-md-surface-variant border border-border rounded text-xs font-mono text-md-on-surface-variant"
                                  >
                                    {funcName}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </details>

                {/* Operators Guide */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold text-md-on-surface-variant mb-2 uppercase tracking-wide">
                    Supported Operators
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('+')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert addition operator"
                    >
                      <code className="text-md-primary font-mono">+</code> <span className="text-md-on-surface-variant ml-1">Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('-')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert subtraction operator"
                    >
                      <code className="text-md-primary font-mono font-semibold">-</code> <span className="text-md-on-surface-variant ml-1">Subtract</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('*')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert multiplication operator"
                    >
                      <code className="text-md-primary font-mono font-semibold">*</code> <span className="text-md-on-surface-variant ml-1">Multiply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('/')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert division operator"
                    >
                      <code className="text-md-primary font-mono font-semibold">/</code> <span className="text-md-on-surface-variant ml-1">Divide</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('()')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert parentheses"
                    >
                      <code className="text-md-primary font-mono font-semibold">()</code> <span className="text-md-on-surface-variant ml-1">Grouping</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('sqrt()')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert square root function"
                    >
                      <code className="text-md-primary font-mono font-semibold">sqrt()</code> <span className="text-md-on-surface-variant ml-1">Square root</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('round()')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert round function"
                    >
                      <code className="text-md-primary font-mono font-semibold">round(x)</code> <span className="text-md-on-surface-variant ml-1">Round to nearest integer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('round(, )')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert round function with decimals"
                    >
                      <code className="text-md-primary font-mono font-semibold">round(x, decimals)</code> <span className="text-md-on-surface-variant ml-1">Round to fixed decimals</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('ceil()')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert ceil function"
                    >
                      <code className="text-md-primary font-mono font-semibold">ceil(x)</code> <span className="text-md-on-surface-variant ml-1">Round up to next integer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertOperatorAtCursor('floor()')}
                      className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                      aria-label="Insert floor function"
                    >
                      <code className="text-md-primary font-mono font-semibold">floor(x)</code> <span className="text-md-on-surface-variant ml-1">Round down to previous integer</span>
                    </button>
                  </div>
                  
                  {/* Comparison Operators */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <h5 className="text-xs font-semibold text-md-on-surface-variant mb-2 uppercase tracking-wide">
                      Comparison Operators
                    </h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('==')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert equals operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">==</code> <span className="text-md-on-surface-variant ml-1">Equals</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('!=')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert not equals operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">!=</code> <span className="text-md-on-surface-variant ml-1">Not equals</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('>')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert greater than operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">&gt;</code> <span className="text-md-on-surface-variant ml-1">Greater than</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('<')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert less than operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">&lt;</code> <span className="text-md-on-surface-variant ml-1">Less than</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('>=')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert greater or equal operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">&gt;=</code> <span className="text-md-on-surface-variant ml-1">Greater or equal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertOperatorAtCursor('<=')}
                        className="px-2 py-0.5 text-left hover:text-md-primary transition-colors cursor-pointer"
                        aria-label="Insert less or equal operator"
                      >
                        <code className="text-md-primary font-mono font-semibold">&lt;=</code> <span className="text-md-on-surface-variant ml-1">Less or equal</span>
                      </button>
                    </div>
                    <p className="text-xs text-md-on-surface-variant mt-3 px-2">
                      <strong>Note:</strong> Boolean fields convert to 1 (true) or 0 (false). Use comparisons for conditional logic, e.g., <code className="text-md-primary">base_price * (include_tax == 1)</code>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* PREVIEW OVERLAY */}
        {showPreview && (
          <div 
            className="fixed inset-0 bg-overlay/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPreview(false);
                setPreviewFieldValues({});
                setPreviewCalculatedCost(0);
                setPreviewError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowPreview(false);
                setPreviewFieldValues({});
                setPreviewCalculatedCost(0);
                setPreviewError(null);
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
                  <span className="font-semibold text-md-on-surface">
                    {formData.name || 'Module Preview'}
                  </span>
                  <span className="px-2 py-0.5 bg-md-primary/10 text-md-primary rounded-full text-xs font-medium">
                    Preview
                  </span>
                  {formData.category && (
                    <span className="px-2.5 py-0.5 bg-md-primary/10 text-md-primary rounded-full text-xs font-medium">
                      {formData.category}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewFieldValues({});
                    setPreviewCalculatedCost(0);
                    setPreviewError(null);
                  }}
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
                    
                    // Helper to format label with unit
                    const formatLabel = (label: string, unit?: string, unitSymbol?: string) => {
                      if (unitSymbol) return `${label} (${unitSymbol})`;
                      if (unit) return `${label} (${unit})`;
                      return label;
                    };

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
                            <label className="block text-sm font-medium text-label-foreground mb-1.5">
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
                                setPreviewFieldValues(prev => ({
                                  ...prev,
                                  [field.variableName]: baseValue
                                }));
                              }}
                              required={field.required}
                            />
                          </div>
                        );
                      }
                      case 'boolean':
                        return (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-label-foreground mb-1.5">
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
                                setPreviewFieldValues(prev => ({
                                  ...prev,
                                  [field.variableName]: e.target.checked
                                }));
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
                              <label className="block text-sm font-medium text-label-foreground mb-1.5">
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
                                      setPreviewFieldValues(prev => ({
                                        ...prev,
                                        [field.variableName]: baseValue
                                      }));
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
                            <label className="block text-sm font-medium text-label-foreground mb-1.5">
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
                                setPreviewFieldValues(prev => ({
                                  ...prev,
                                  [field.variableName]: e.target.value
                                }));
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
                              <label className="block text-sm font-medium text-label-foreground">
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
                                setPreviewFieldValues(prev => ({
                                  ...prev,
                                  [field.variableName]: e.target.value
                                }));
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
                            <label className="block text-sm font-medium text-label-foreground mb-1.5">
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
                                setPreviewFieldValues(prev => ({
                                  ...prev,
                                  [field.variableName]: e.target.value
                                }));
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
        )}

        {/* BOTTOM ACTION BAR */}
        <div data-bottom-action-bar className="fixed bottom-0 left-0 right-0 bg-md-surface-container-high/95 backdrop-blur-md border-t border-border px-4 py-4 z-40 elevation-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <Button onClick={addField} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                variant="secondary"
                onClick={() => {
                  // Initialize preview with defaults
                  const defaults: Record<string, string | number | boolean> = {};
                  fields.forEach((field) => {
                    if (field.variableName) {
                      if (field.defaultValue !== undefined) {
                        defaults[field.variableName] = field.defaultValue;
                      } else {
                        switch (field.type) {
                          case 'number':
                            defaults[field.variableName] = ''; // Empty, not 0
                            break;
                          case 'boolean':
                            defaults[field.variableName] = false;
                            break;
                          case 'dropdown':
                            defaults[field.variableName] = ''; // Empty - require selection
                            break;
                          case 'material':
                            // If category exists, preselect first matching material
                            const materials = useMaterialsStore.getState().materials;
                            let candidateMaterials = materials;
                            if (field.materialCategory && field.materialCategory.trim()) {
                              candidateMaterials = materials.filter(m => m.category === field.materialCategory);
                            }
                            if (candidateMaterials.length > 0) {
                              defaults[field.variableName] = candidateMaterials[0].variableName;
                            } else {
                              defaults[field.variableName] = '';
                            }
                            break;
                          case 'text':
                            defaults[field.variableName] = '';
                            break;
                        }
                      }
                    }
                  });
                  setPreviewFieldValues(defaults);
                  setShowPreview(true);
                }}
                disabled={!formulaValidation.valid || fields.length === 0}
                className="rounded-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            <Button variant="ghost" onClick={cancelEditing} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="rounded-full">
              {editingModuleId === 'new' ? 'Create' : 'Update'} Module
            </Button>
            </div>
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
          <p className="text-lg text-md-on-surface-variant">Create reusable calculation modules with custom fields and formulas</p>
        </div>
        <Button onClick={() => startEditing()} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-md-surface-variant elevation-4 mb-6" aria-hidden="true">
              <Calculator className="h-12 w-12 text-md-on-surface-variant" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">No Modules Yet</h3>
            <p className="text-base text-md-on-surface-variant mb-8 max-w-md mx-auto leading-relaxed">Create your first calculation module to get started building professional estimates.</p>
            <Button onClick={() => startEditing()} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.id}
              className="hover:border-accent/30 transition-smooth cursor-pointer group relative"
              onClick={() => startEditing(module)}
            >
              <Card className="h-full hover:border-accent/30">
                {/* Delete button - top right corner */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this module?')) {
                      deleteModule(module.id);
                    }
                  }}
                  className="absolute top-4 right-4 p-2 text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 rounded-lg transition-smooth active:scale-95 z-10"
                  aria-label="Delete module"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <h3 className="text-lg font-bold text-md-on-surface mb-3 group-hover:text-md-primary transition-smooth tracking-tight pr-10">
                  {module.name}
                </h3>
              {module.category && (
                <div className="mb-3">
                  <span className="px-3 py-1 bg-md-primary/10 text-md-primary text-xs font-medium rounded-full">
                    {module.category}
                  </span>
                </div>
              )}
              <p className="text-sm text-md-on-surface-variant mb-4 line-clamp-2">
                {module.description || 'No description'}
              </p>
              <div className="mb-5">
                <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-2">Fields</p>
                <div className="flex flex-wrap gap-2">
                  {module.fields.map((field) => (
                    <span
                      key={field.id}
                      className="px-2.5 py-1 bg-md-surface-variant text-md-on-surface-variant rounded-full text-xs"
                    >
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-md-on-surface-variant mb-1">Formula:</p>
                <code className="block px-3 py-2 bg-md-surface-variant rounded text-sm text-md-primary break-all">
                  {module.formula}
                </code>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
