'use client';

import { useCallback, useRef, useMemo } from 'react';
import { ModuleCardShell } from '@/components/shared/ModuleCardShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Chip } from '@/components/ui/Chip';
import { Checkbox } from '@/components/ui/Checkbox';
import { ComputedOutput, UnitCategory, Field, SharedFunction } from '@/lib/types';
import { useFormulaAutocomplete } from '@/hooks/use-formula-autocomplete';
import { cn } from '@/lib/utils';

type ValidationResult = { valid: boolean; error?: string };

interface AutocompleteCandidate {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
  functionSignature?: string;
}

interface ComputedOutputItemProps {
  output: ComputedOutput;
  isExpanded: boolean;
  outputError: Record<string, string>;
  unitCategoryOptions: Array<{ value: UnitCategory; label: string }>;
  unitSymbolOptions: string[];
  variableNameValidation: ValidationResult;
  expressionValidation: ValidationResult;
  fields: Field[];
  functions: SharedFunction[];
  computedOutputs: ComputedOutput[];
  onToggle: () => void;
  onRemove: () => void;
  onLabelChange: (value: string) => void;
  onVariableNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onUnitCategoryChange: (value: UnitCategory | undefined) => void;
  onUnitSymbolChange: (value: string) => void;
  onExpressionChange: (value: string) => void;
  onShowInQuoteChange: (value: boolean) => void;
  setTextareaRef: (el: HTMLTextAreaElement | null) => void;
}

export function ComputedOutputItem({
  output,
  isExpanded,
  outputError,
  unitCategoryOptions,
  unitSymbolOptions,
  variableNameValidation,
  expressionValidation,
  fields,
  functions,
  computedOutputs,
  onToggle,
  onRemove,
  onLabelChange,
  onVariableNameChange,
  onDescriptionChange,
  onUnitCategoryChange,
  onUnitSymbolChange,
  onExpressionChange,
  onShowInQuoteChange,
  setTextareaRef,
}: ComputedOutputItemProps) {
  const expressionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Collect autocomplete candidates for computed output expressions
  // Only includes: fields, functions, and previously defined computed outputs (by variable name, not out.)
  const collectAutocompleteCandidates = useMemo<AutocompleteCandidate[]>(() => {
    const candidates: AutocompleteCandidate[] = [];

    // Find current output index to determine which computed outputs are "previous"
    const currentOutputIndex = computedOutputs.findIndex((o) => o.id === output.id);

    // Field variables
    fields.forEach((field) => {
      if (field.variableName) {
        candidates.push({
          name: field.variableName,
          displayName: field.variableName,
          type: 'field',
          description: field.label !== field.variableName ? field.label : undefined,
        });

        // If it's a material field, add its properties
        if (field.type === 'material') {
          // Get materials from store (we'll need to import it or pass materials as prop)
          // For now, we'll skip material properties in computed output expressions
          // as they require materials data which isn't currently passed
        }
      }
    });

    // Previously defined computed outputs (by variable name, NOT out.variableName)
    if (currentOutputIndex > 0) {
      for (let i = 0; i < currentOutputIndex; i++) {
        const prevOutput = computedOutputs[i];
        if (prevOutput.variableName) {
          const unitDisplay = prevOutput.unitSymbol ? ` (${prevOutput.unitSymbol})` : '';
          candidates.push({
            name: prevOutput.variableName,
            displayName: `${prevOutput.variableName}${unitDisplay}`,
            type: 'field', // Treat as field type for autocomplete
            description: prevOutput.label || prevOutput.variableName,
          });
        }
      }
    }

    // Built-in math functions
    const mathFunctions = [
      { name: 'sqrt', displayName: 'sqrt()', description: 'Square root' },
      { name: 'round', displayName: 'round()', description: 'Round to nearest integer' },
      { name: 'ceil', displayName: 'ceil()', description: 'Round up' },
      { name: 'floor', displayName: 'floor()', description: 'Round down' },
      { name: 'abs', displayName: 'abs()', description: 'Absolute value' },
      { name: 'max', displayName: 'max()', description: 'Maximum value' },
      { name: 'min', displayName: 'min()', description: 'Minimum value' },
    ];
    mathFunctions.forEach((fn) => {
      candidates.push({
        name: fn.name,
        displayName: fn.displayName,
        type: 'function',
        description: fn.description,
      });
    });

    // User-defined shared functions
    functions.forEach((func) => {
      const paramNames = func.parameters.map((p) => p.name).join(', ');
      candidates.push({
        name: func.name,
        displayName: `${func.name}(${paramNames})`,
        type: 'function',
        description: func.description || `User-defined function: ${func.formula}`,
        functionSignature: paramNames,
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
  }, [fields, functions, computedOutputs, output.id]);

  // Autocomplete hook
  const {
    autocompleteSuggestions,
    selectedSuggestionIndex,
    isAutocompleteOpen,
    autocompletePosition,
    currentWord,
    recentlyUsedVariables,
    insertSuggestion,
    handleAutocompleteKeyDown,
    updateAutocompleteSuggestionsFinal,
    setSelectedSuggestionIndex,
    setIsAutocompleteOpen,
  } = useFormulaAutocomplete({
    formula: output.expression,
    formulaTextareaRef: expressionTextareaRef,
    collectAutocompleteCandidates,
    onFormulaChange: onExpressionChange,
  });

  // Combine refs: both the parent's ref callback and our internal ref
  const combinedTextareaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      expressionTextareaRef.current = el;
      setTextareaRef(el);
    },
    [setTextareaRef]
  );

  const cardRef = useCallback((el: HTMLDivElement | null) => {
    // No-op ref to satisfy ModuleCardShell API for non-sortable items
    return el;
  }, []);

  const dragHandleProps = {
    attributes: {
      tabIndex: -1,
      'aria-hidden': true,
      style: { visibility: 'hidden' as const, pointerEvents: 'none' as const },
    },
    listeners: {},
  };

  const metaChips = [
    output.variableName ? (
      <Chip key="var" size="sm" className="font-mono text-xs">
        {output.variableName}
      </Chip>
    ) : null,
    output.unitSymbol ? (
      <Chip key="unit" size="sm" variant="muted" className="text-xs">
        {output.unitSymbol}
      </Chip>
    ) : null,
    output.variableName && !variableNameValidation.valid ? (
      <Chip
        key="var-error"
        size="sm"
        variant="error"
        className="text-xs max-w-[200px] truncate"
        title={variableNameValidation.error}
      >
        {variableNameValidation.error || 'Invalid variable name'}
      </Chip>
    ) : null,
    output.expression && !expressionValidation.valid ? (
      <Chip
        key="expr-error"
        size="sm"
        variant="error"
        className="text-xs max-w-[200px] truncate"
        title={expressionValidation.error}
      >
        {expressionValidation.error || 'Invalid expression'}
      </Chip>
    ) : null,
  ].filter(Boolean);

  return (
    <ModuleCardShell
      cardRef={cardRef}
      dragHandleProps={dragHandleProps}
      title={output.label || 'Unnamed Output'}
      isCollapsed={!isExpanded}
      onToggle={onToggle}
      onRemove={onRemove}
      metaChips={metaChips}
    >
      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Label"
              value={output.label}
              onChange={(e) => onLabelChange(e.target.value)}
              error={outputError.label}
              placeholder="e.g., Paint Area"
              required
            />
            <Input
              label="Variable Name"
              value={output.variableName}
              onChange={(e) => onVariableNameChange(e.target.value)}
              error={
                outputError.variableName ||
                (output.variableName && !variableNameValidation.valid
                  ? variableNameValidation.error
                  : undefined)
              }
              placeholder="e.g., paint_area_m2"
              required
            />
          </div>

          <div>
            <Textarea
              label="Description (optional)"
              value={output.description || ''}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Describe what this computed output represents..."
            />
          </div>

          <div>
            <Checkbox
              label="Show in quote summary"
              checked={output.showInQuote || false}
              onChange={(e) => onShowInQuoteChange(e.target.checked)}
            />
            <p className="text-xs text-md-on-surface-variant mt-1 ml-6">
              Display this computed output in the quote summary line item
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Unit Category (optional)"
              value={output.unitCategory || ''}
              onChange={(e) => onUnitCategoryChange((e.target.value as UnitCategory) || undefined)}
              options={[
                { value: '', label: 'None' },
                ...unitCategoryOptions,
              ]}
            />
            <Select
              label="Unit Symbol (optional)"
              value={output.unitSymbol || ''}
              onChange={(e) => onUnitSymbolChange(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...unitSymbolOptions.map((symbol) => ({ value: symbol, label: symbol })),
              ]}
              disabled={!output.unitCategory}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-md-on-surface-variant mb-1.5">
              Expression <span className="text-md-error">*</span>
            </label>
            <div className="relative">
              <Textarea
                ref={combinedTextareaRef}
                value={output.expression}
                onChange={(e) => {
                  onExpressionChange(e.target.value);
                  // Update autocomplete immediately with the new value
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
                rows={3}
                placeholder="e.g., area(width, height) or width * height"
                className={cn(
                  'font-mono text-sm',
                  !expressionValidation.valid && 'border-destructive'
                )}
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
                          'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                          isSelected
                            ? 'bg-md-primary text-md-on-primary'
                            : 'hover:bg-md-surface-variant'
                        )}
                      >
                        <code className="text-xs font-mono flex-1">{suggestion.displayName}</code>
                        {isRecent && (
                          <span className="text-xs text-md-on-surface-variant">●</span>
                        )}
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            suggestion.type === 'field' && 'bg-md-primary/10 text-md-primary',
                            suggestion.type === 'material' && 'bg-success/10 text-success',
                            suggestion.type === 'property' && 'bg-md-primary-muted/10 text-md-primary-muted',
                            suggestion.type === 'function' && 'bg-warning/10 text-warning',
                            suggestion.type === 'constant' && 'bg-warning/10 text-warning'
                          )}
                        >
                          {suggestion.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {expressionValidation.error && (
                <p className="text-xs text-destructive mt-1">{expressionValidation.error}</p>
              )}
              {expressionValidation.valid && output.expression && (
                <p className="text-xs text-success mt-1">Expression is valid</p>
              )}
            </div>
            <p className="text-xs text-md-on-surface-variant mt-1">
              Use field variable names, functions, and previously defined computed outputs (by variable name).
            </p>
          </div>
        </div>
      )}
    </ModuleCardShell>
  );
}
