'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Field, Material } from '@/lib/types';
import { AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';
import { FormulaDebugPanel } from './formula-builder/FormulaDebugPanel';
import { FormulaEditorPanel } from './formula-builder/FormulaEditorPanel';
import { FormulaOperatorGuide } from './formula-builder/FormulaOperatorGuide';
import { FormulaVariableSections } from './formula-builder/FormulaVariableSections';
import {
  ComputedOutputVariable,
  FieldPropertyInfo,
  FormulaValidationState,
  FormulaWordInfo,
  LaborPropertyInfo,
  LaborVariableInfo,
  MaterialVariableInfo,
  VariableInfo,
} from './formula-builder/types';

interface FormulaBuilderProps {
  formula: string;
  onFormulaChange: (formula: string) => void;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  formulaValidation: FormulaValidationState;
  formulaError?: string;

  availableFieldVariables: VariableInfo[];
  availableMaterialVariables: MaterialVariableInfo[];
  availableLaborVariables?: LaborVariableInfo[];
  allFields: VariableInfo[];
  usedFields: number;

  fieldVariablesExpanded: boolean;
  materialVariablesExpanded: boolean;
  laborVariablesExpanded?: boolean;
  expandedField: string | null;
  expandedMaterial: string | null;
  expandedLabor?: string | null;
  onToggleFieldVariablesExpanded: () => void;
  onToggleMaterialVariablesExpanded: () => void;
  onToggleLaborVariablesExpanded?: () => void;
  onSetExpandedField: (fieldName: string | null) => void;
  onSetExpandedMaterial: (materialName: string | null) => void;
  onSetExpandedLabor?: (laborName: string | null) => void;

  isVariableInFormula: (variableName: string, formula: string) => boolean;
  isPropertyReferenceInFormula: (materialVar: string, propertyName: string, formula: string) => boolean;
  getMaterialFieldProperties: (fieldVar: string) => FieldPropertyInfo[];
  getLaborFieldProperties?: (fieldVar: string) => LaborPropertyInfo[];
  insertVariableAtCursor: (variableName: string) => void;
  insertOperatorAtCursor: (operator: string) => void;

  autocompleteSuggestions: AutocompleteSuggestion[];
  selectedSuggestionIndex: number;
  isAutocompleteOpen: boolean;
  autocompletePosition: { top: number; left: number };
  currentWord: FormulaWordInfo;
  recentlyUsedVariables: string[];
  insertSuggestion: (suggestion: AutocompleteSuggestion, wordInfo: FormulaWordInfo) => void;
  handleAutocompleteKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  updateAutocompleteSuggestionsFinal: () => void;
  onSetSelectedSuggestionIndex: (index: number) => void;
  onSetIsAutocompleteOpen: (open: boolean) => void;

  materials: Material[];
  fields: Field[];
  computedOutputs?: ComputedOutputVariable[];
}

export function FormulaBuilder({
  formula,
  onFormulaChange,
  formulaTextareaRef,
  formulaValidation,
  formulaError,
  availableFieldVariables,
  availableMaterialVariables,
  availableLaborVariables = [],
  allFields,
  usedFields,
  fieldVariablesExpanded,
  materialVariablesExpanded,
  laborVariablesExpanded = true,
  expandedField: _expandedField,
  expandedMaterial: _expandedMaterial,
  expandedLabor: _expandedLabor,
  onToggleFieldVariablesExpanded,
  onToggleMaterialVariablesExpanded,
  onToggleLaborVariablesExpanded,
  onSetExpandedField: _onSetExpandedField,
  onSetExpandedMaterial: _onSetExpandedMaterial,
  onSetExpandedLabor: _onSetExpandedLabor,
  isVariableInFormula,
  isPropertyReferenceInFormula,
  getMaterialFieldProperties,
  getLaborFieldProperties,
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
  return (
    <Card title="Formula Builder" className="sticky top-[88px]">
      <div className="space-y-6">
        <FormulaVariableSections
          formula={formula}
          availableFieldVariables={availableFieldVariables}
          availableMaterialVariables={availableMaterialVariables}
          availableLaborVariables={availableLaborVariables}
          allFields={allFields}
          usedFields={usedFields}
          fieldVariablesExpanded={fieldVariablesExpanded}
          materialVariablesExpanded={materialVariablesExpanded}
          laborVariablesExpanded={laborVariablesExpanded}
          onToggleFieldVariablesExpanded={onToggleFieldVariablesExpanded}
          onToggleMaterialVariablesExpanded={onToggleMaterialVariablesExpanded}
          onToggleLaborVariablesExpanded={onToggleLaborVariablesExpanded}
          isVariableInFormula={isVariableInFormula}
          isPropertyReferenceInFormula={isPropertyReferenceInFormula}
          getMaterialFieldProperties={getMaterialFieldProperties}
          getLaborFieldProperties={getLaborFieldProperties}
          insertVariableAtCursor={insertVariableAtCursor}
          materials={materials}
        />

        <FormulaEditorPanel
          formula={formula}
          onFormulaChange={onFormulaChange}
          formulaTextareaRef={formulaTextareaRef}
          formulaValidation={formulaValidation}
          formulaError={formulaError}
          autocompleteSuggestions={autocompleteSuggestions}
          selectedSuggestionIndex={selectedSuggestionIndex}
          isAutocompleteOpen={isAutocompleteOpen}
          autocompletePosition={autocompletePosition}
          currentWord={currentWord}
          recentlyUsedVariables={recentlyUsedVariables}
          insertSuggestion={insertSuggestion}
          handleAutocompleteKeyDown={handleAutocompleteKeyDown}
          updateAutocompleteSuggestionsFinal={updateAutocompleteSuggestionsFinal}
          onSetSelectedSuggestionIndex={onSetSelectedSuggestionIndex}
          onSetIsAutocompleteOpen={onSetIsAutocompleteOpen}
        />

        <FormulaDebugPanel
          formula={formula}
          availableFieldVariables={availableFieldVariables}
          materials={materials}
          fields={fields}
          computedOutputs={computedOutputs}
        />

        <FormulaOperatorGuide onInsertOperator={insertOperatorAtCursor} />
      </div>
    </Card>
  );
}
