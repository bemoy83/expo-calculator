'use client';

import React, { useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { analyzeFormulaVariables } from '@/lib/formula-evaluator';
import { Field, Material } from '@/lib/types';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  Calculator
} from 'lucide-react';
import Chip from '../ui/Chip';
import { FormulaExpandableVariable } from "@/components/formula/FormulaExpandableVariable";

interface VariableInfo {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  materialCategory?: string;
}

interface MaterialVariableInfo {
  name: string;
  label: string;
  price: number;
  unit: string;
  properties: Array<{ id: string; name: string; unit?: string; unitSymbol?: string; type: string }>;
}

interface AutocompleteSuggestion {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
}

interface FormulaBuilderProps {
  // Formula state
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  
  // Validation state
  formulaValidation: {
    valid: boolean;
    error?: string;
    preview?: number;
  };
  formulaError?: string;
  
  // Variable lists
  availableFieldVariables: VariableInfo[];
  availableMaterialVariables: MaterialVariableInfo[];
  allFields: VariableInfo[];
  usedFields: number;
  
  // Expansion state
  fieldVariablesExpanded: boolean;
  materialVariablesExpanded: boolean;
  expandedField: string | null;
  expandedMaterial: string | null;
  onToggleFieldVariablesExpanded: () => void;
  onToggleMaterialVariablesExpanded: () => void;
  onSetExpandedField: (fieldName: string | null) => void;
  onSetExpandedMaterial: (materialName: string | null) => void;
  
  // Helper functions
  isVariableInFormula: (variableName: string, formula: string) => boolean;
  isPropertyReferenceInFormula: (materialVar: string, propertyName: string, formula: string) => boolean;
  getMaterialFieldProperties: (fieldVar: string) => Array<{ name: string; unit?: string; unitSymbol?: string; type: string }>;
  insertVariableAtCursor: (variableName: string) => void;
  insertOperatorAtCursor: (operator: string) => void;
  
  // Autocomplete state and handlers
  autocompleteSuggestions: AutocompleteSuggestion[];
  selectedSuggestionIndex: number;
  isAutocompleteOpen: boolean;
  autocompletePosition: { top: number; left: number };
  currentWord: { word: string; start: number; end: number; hasDot: boolean; baseWord: string };
  recentlyUsedVariables: string[];
  insertSuggestion: (suggestion: AutocompleteSuggestion, wordInfo: { word: string; start: number; end: number; hasDot: boolean; baseWord: string }) => void;
  handleAutocompleteKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  updateAutocompleteSuggestionsFinal: () => void;
  onSetSelectedSuggestionIndex: (index: number) => void;
  onSetIsAutocompleteOpen: (open: boolean) => void;
  
  // Data dependencies
  materials: Material[];
  fields: Field[];
  computedOutputs?: Array<{ variableName: string; label: string; unitSymbol?: string }>; // Computed outputs for this module
}

export function FormulaBuilder({
  formula,
  onFormulaChange,
  formulaTextareaRef,
  formulaValidation,
  formulaError,
  availableFieldVariables,
  availableMaterialVariables,
  allFields,
  usedFields,
  fieldVariablesExpanded,
  materialVariablesExpanded,
  expandedField,
  expandedMaterial,
  onToggleFieldVariablesExpanded,
  onToggleMaterialVariablesExpanded,
  onSetExpandedField,
  onSetExpandedMaterial,
  isVariableInFormula,
  isPropertyReferenceInFormula,
  getMaterialFieldProperties,
  insertVariableAtCursor,
  insertOperatorAtCursor,
  autocompleteSuggestions,
  selectedSuggestionIndex,
  isAutocompleteOpen,
  autocompletePosition,
  currentWord,
  recentlyUsedVariables,
  insertSuggestion,
  handleAutocompleteKeyDown,
  updateAutocompleteSuggestionsFinal,
  onSetSelectedSuggestionIndex,
  onSetIsAutocompleteOpen,
  materials,
  fields,
  computedOutputs = [],
}: FormulaBuilderProps) {
  const functions = useFunctionsStore((state) => state.functions);
  
  return (
    <Card title="Formula Builder" className="sticky top-[88px]">
      <div className="space-y-6">
        {/* Available Variables */}
        {availableFieldVariables.length > 0 && (
          <div>
            <button
              type="button"
              onClick={onToggleFieldVariablesExpanded}
              className="flex items-center justify-between w-full mb-3 group"
              aria-expanded={fieldVariablesExpanded}
            >
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-md-primary">Field Variables</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableFieldVariables.map((varInfo) => {
                  const isInFormula = isVariableInFormula(varInfo.name, formula);
                  const showCheckmark = isInFormula;

                  return (
                    <FormulaExpandableVariable
                      key={varInfo.name}
                      label={varInfo.name}
                      value={varInfo.name}
                      isUsed={showCheckmark}
                      onInsert={insertVariableAtCursor}
                      properties={getMaterialFieldProperties(varInfo.name).map((prop) => {
                        const propertyRef = `${varInfo.name}.${prop.name}`;
                        const unitDisplay = prop.unitSymbol || prop.unit || '';
                        const propertyLabel = unitDisplay
                          ? `${prop.name} (${unitDisplay})`
                          : prop.name;

                        return {
                          label: propertyLabel,
                          value: propertyRef,
                          isUsed: isPropertyReferenceInFormula(varInfo.name, prop.name, formula),
                        };
                      })}
                    />
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
              onClick={onToggleMaterialVariablesExpanded}
              className="flex items-center justify-between w-full mb-3 group"
              aria-expanded={materialVariablesExpanded}
            >
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-md-primary">Material Variables</h4>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableMaterialVariables.map((mat) => {
                  const isMaterialInFormula = isVariableInFormula(mat.name, formula);

                  return (
                    <FormulaExpandableVariable
                      key={mat.name}
                      label={mat.name}
                      value={mat.name}
                      isUsed={isMaterialInFormula}
                      onInsert={insertVariableAtCursor}
                      properties={(mat.properties ?? []).map((prop) => {
                        const propertyRef = `${mat.name}.${prop.name}`;
                        const unitDisplay = prop.unitSymbol || prop.unit || '';
                        const propertyLabel = unitDisplay
                          ? `${prop.name} (${unitDisplay})`
                          : prop.name;

                        return {
                          key: prop.id || prop.name,
                          label: propertyLabel,
                          value: propertyRef,
                          isUsed: isPropertyReferenceInFormula(
                            mat.name,
                            prop.name,
                            formula
                          ),
                        };
                      })}
                    />
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
            <label htmlFor="formula-input" className="text-sm font-semibold text-md-primary">Formula</label>
            {formula && (
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
              autoGrow={true}
              ref={formulaTextareaRef}
              id="formula-input"
              value={formula}
              onChange={(e) => {
                onFormulaChange(e.target.value);
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
                setTimeout(() => onSetIsAutocompleteOpen(false), 200);
              }}
              error={formulaError || formulaValidation.error}
              placeholder="e.g., width * height * mat_plank.length * quantity"
              rows={6}
              className={`font-mono text-sm text-md-primary ${
                formulaValidation.valid && formula
                  ? 'border-success/50 focus:ring-success/50'
                  : formula && !formulaValidation.valid
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
                      onMouseEnter={() => onSetSelectedSuggestionIndex(index)}
                      className={cn(
                        "w-full px-3 py-2 text-left flex items-center gap-2 transition-colors",
                        isSelected
                          ? "bg-md-primary text-md-on-primary"
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
          <div className="mt-3 space-y-3 p-3">
            {(() => {
              // Include computed outputs in available variables (with 'out.' prefix)
              const computedOutputVars = computedOutputs.map((o) => `out.${o.variableName}`);
              const allAvailableVars = [
                ...availableFieldVariables.map(v => v.name),
                ...computedOutputVars,
              ];
              
              const debugInfo = analyzeFormulaVariables(
                formula,
                allAvailableVars,
                materials,
                fields.map(f => ({
                  variableName: f.variableName,
                  type: f.type,
                  materialCategory: f.materialCategory,
                })),
                functions
              );
              
              return (
                <>
                  {/* Standalone Variables */}
                  <div>
                    <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                      Standalone Variables ({debugInfo.variables.length})
                    </h5>
                    {debugInfo.variables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.variables.map((varName: string) => (
                          <Chip key={varName} size="sm" variant="primary" className="font-mono text-xs">
                            {varName}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-md-on-surface-variant italic">None</p>
                    )}
                  </div>

                  {/* Function Calls */}
                  <div>
                    <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                      Function Calls ({debugInfo.functionCalls?.length || 0})
                    </h5>
                    {debugInfo.functionCalls && debugInfo.functionCalls.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.functionCalls.map((call: { name: string; arguments: string[]; fullMatch: string }, idx: number) => (
                          <Chip
                            key={`${call.name}-${idx}`}
                            size="sm"
                            variant="primary"
                            className="font-mono text-xs"
                            title={`${call.name}(${call.arguments.join(', ')})`}
                          >
                            {call.fullMatch}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-md-on-surface-variant italic">None</p>
                    )}
                  </div>

                  {/* Computed Outputs */}
                  {debugInfo.computedOutputs && debugInfo.computedOutputs.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                        Computed Outputs ({debugInfo.computedOutputs.length})
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.computedOutputs.map((varName: string) => (
                          <Chip key={varName} size="sm" variant="primaryTonal" className="font-mono text-xs">
                            {varName}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unknown Variables */}
                  <div>
                    <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                      Unknown Variables ({debugInfo.unknownVariables.length})
                    </h5>
                    {debugInfo.unknownVariables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.unknownVariables.map((varName: string) => (
                          <Chip key={varName} size="sm" variant="error" className="font-mono text-xs">
                            {varName}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-md-on-surface-variant italic">None</p>
                    )}
                  </div>

                  {/* Field Property References */}
                  <div>
                    <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                      Field Property References ({debugInfo.fieldPropertyRefs.length})
                    </h5>
                    {debugInfo.fieldPropertyRefs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.fieldPropertyRefs.map((ref: { full: string; fieldVar: string; property: string }, idx: number) => (
                          <Chip
                            key={`${ref.full}-${idx}`}
                            size="sm"
                            variant="default"
                            className="font-mono text-xs"
                            title={`${ref.fieldVar}.${ref.property}`}
                          >
                            {ref.full}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-md-on-surface-variant italic">None</p>
                    )}
                  </div>

                  {/* Material Property References */}
                  <div>
                    <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                      Material Property References ({debugInfo.materialPropertyRefs.length})
                    </h5>
                    {debugInfo.materialPropertyRefs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.materialPropertyRefs.map((ref: { full: string; materialVar: string; property: string }, idx: number) => (
                          <Chip
                            key={`${ref.full}-${idx}`}
                            size="sm"
                            variant="default"
                            className="font-mono text-xs"
                            title={`${ref.materialVar}.${ref.property}`}
                          >
                            {ref.full}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-md-on-surface-variant italic">None</p>
                    )}
                  </div>

                  {/* Math Functions (for reference) */}
                  {debugInfo.mathFunctions.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-md-primary mb-1.5">
                        Math Functions ({debugInfo.mathFunctions.length})
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {debugInfo.mathFunctions.map((funcName: string) => (
                          <Chip key={funcName} size="sm" variant="outline" className="font-mono text-xs">
                            {funcName}
                          </Chip>
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
          <h4 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
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
            <h5 className="text-xs font-semibold text-md-primary mb-2 uppercase tracking-wide">
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
  );
}








