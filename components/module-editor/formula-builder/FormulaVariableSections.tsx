'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import { FormulaExpandableVariable } from '@/components/formula/FormulaExpandableVariable';
import { Material } from '@/lib/types';
import {
  FieldPropertyInfo,
  LaborPropertyInfo,
  LaborVariableInfo,
  MaterialVariableInfo,
  VariableInfo,
} from './types';
import { useMaterialVariableFilter } from './use-material-variable-filter';

interface FormulaVariableSectionsProps {
  formula: string;
  availableFieldVariables: VariableInfo[];
  availableMaterialVariables: MaterialVariableInfo[];
  availableLaborVariables: LaborVariableInfo[];
  allFields: VariableInfo[];
  usedFields: number;
  fieldVariablesExpanded: boolean;
  materialVariablesExpanded: boolean;
  laborVariablesExpanded: boolean;
  onToggleFieldVariablesExpanded: () => void;
  onToggleMaterialVariablesExpanded: () => void;
  onToggleLaborVariablesExpanded?: () => void;
  isVariableInFormula: (variableName: string, formula: string) => boolean;
  isPropertyReferenceInFormula: (materialVar: string, propertyName: string, formula: string) => boolean;
  getMaterialFieldProperties: (fieldVar: string) => FieldPropertyInfo[];
  getLaborFieldProperties?: (fieldVar: string) => LaborPropertyInfo[];
  insertVariableAtCursor: (variableName: string) => void;
  materials: Material[];
}

function SectionToggle({
  title,
  meta,
  expanded,
  onToggle,
}: {
  title: string;
  meta?: React.ReactNode;
  expanded: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full mb-3 group"
      aria-expanded={expanded}
    >
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-md-primary">{title}</h4>
        {meta}
      </div>
      {expanded ? (
        <ChevronDown className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
      ) : (
        <ChevronRight className="h-4 w-4 text-md-on-surface-variant group-hover:text-md-on-surface transition-colors" />
      )}
    </button>
  );
}

function formatPropertyLabel(prop: { name: string; unit?: string; unitSymbol?: string }) {
  const unitDisplay = prop.unitSymbol || prop.unit || '';
  return unitDisplay ? `${prop.name} (${unitDisplay})` : prop.name;
}

export function FormulaVariableSections({
  formula,
  availableFieldVariables,
  availableMaterialVariables,
  availableLaborVariables,
  allFields,
  usedFields,
  fieldVariablesExpanded,
  materialVariablesExpanded,
  laborVariablesExpanded,
  onToggleFieldVariablesExpanded,
  onToggleMaterialVariablesExpanded,
  onToggleLaborVariablesExpanded,
  isVariableInFormula,
  isPropertyReferenceInFormula,
  getMaterialFieldProperties,
  getLaborFieldProperties,
  insertVariableAtCursor,
  materials,
}: FormulaVariableSectionsProps) {
  const {
    filteredMaterialVariables,
    materialCategories,
    materialCategoryCounts,
    selectedMaterialCategory,
    setSelectedMaterialCategory,
  } = useMaterialVariableFilter(materials, availableMaterialVariables);

  const hasVariables =
    availableFieldVariables.length > 0 ||
    availableMaterialVariables.length > 0 ||
    availableLaborVariables.length > 0;

  return (
    <>
      {availableFieldVariables.length > 0 && (
        <div>
          <SectionToggle
            title="Field Variables"
            expanded={fieldVariablesExpanded}
            onToggle={onToggleFieldVariablesExpanded}
            meta={
              allFields.length > 0 ? (
                <span className="text-xs text-md-on-surface-variant">
                  {usedFields}/{allFields.length} fields
                </span>
              ) : undefined
            }
          />
          {fieldVariablesExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableFieldVariables.map((varInfo) => {
                let fieldProperties: FieldPropertyInfo[] | LaborPropertyInfo[] = [];
                const fieldType = varInfo.type?.toLowerCase();

                if (fieldType === 'material') {
                  fieldProperties = getMaterialFieldProperties(varInfo.name);
                } else if (fieldType === 'labor' && getLaborFieldProperties) {
                  fieldProperties = getLaborFieldProperties(varInfo.name);
                }

                return (
                  <FormulaExpandableVariable
                    key={varInfo.name}
                    label={varInfo.name}
                    value={varInfo.name}
                    isUsed={isVariableInFormula(varInfo.name, formula)}
                    onInsert={insertVariableAtCursor}
                    properties={fieldProperties.map((prop) => ({
                      label: formatPropertyLabel(prop),
                      value: `${varInfo.name}.${prop.name}`,
                      isUsed: isPropertyReferenceInFormula(varInfo.name, prop.name, formula),
                    }))}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {availableMaterialVariables.length > 0 && (
        <div>
          <SectionToggle
            title="Material Variables"
            expanded={materialVariablesExpanded}
            onToggle={onToggleMaterialVariablesExpanded}
            meta={
              <span className="text-xs text-md-on-surface-variant">
                {filteredMaterialVariables.length}
                {filteredMaterialVariables.length !== availableMaterialVariables.length && (
                  <span> of {availableMaterialVariables.length}</span>
                )}{' '}
                {availableMaterialVariables.length === 1 ? 'material' : 'materials'}
              </span>
            }
          />
          {!materialVariablesExpanded && (
            <p className="text-xs text-md-on-surface-variant mb-3">
              Click to expand and access material variables for your formula.
            </p>
          )}
          {materialVariablesExpanded && (
            <>
              {materialCategories.length > 1 && (
                <div className="flex flex-nowrap gap-2 mb-3 overflow-x-auto no-scrollbar">
                  <Chip
                    size="sm"
                    variant={selectedMaterialCategory === null ? 'selected' : 'outline'}
                    onClick={() => setSelectedMaterialCategory(null)}
                  >
                    All ({availableMaterialVariables.length})
                  </Chip>
                  {materialCategories.map((category) => (
                    <Chip
                      key={category}
                      size="sm"
                      variant={selectedMaterialCategory === category ? 'selected' : 'outline'}
                      onClick={() => setSelectedMaterialCategory(category)}
                    >
                      {category} ({materialCategoryCounts.get(category) ?? 0})
                    </Chip>
                  ))}
                </div>
              )}

              {filteredMaterialVariables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMaterialVariables.map((mat) => (
                    <FormulaExpandableVariable
                      key={mat.name}
                      label={mat.name}
                      value={mat.name}
                      isUsed={isVariableInFormula(mat.name, formula)}
                      onInsert={insertVariableAtCursor}
                      properties={(mat.properties ?? []).map((prop) => ({
                        label: formatPropertyLabel(prop),
                        value: `${mat.name}.${prop.name}`,
                        isUsed: isPropertyReferenceInFormula(mat.name, prop.name, formula),
                      }))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-md-on-surface-variant">
                  No materials in this category.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {availableLaborVariables.length > 0 && (
        <div>
          <SectionToggle
            title="Labor Variables"
            expanded={laborVariablesExpanded}
            onToggle={onToggleLaborVariablesExpanded}
            meta={
              <span className="text-xs text-md-on-surface-variant">
                {availableLaborVariables.length}{' '}
                {availableLaborVariables.length === 1 ? 'labor item' : 'labor items'}
              </span>
            }
          />
          {!laborVariablesExpanded && (
            <div className="text-xs text-md-on-surface-variant mb-3">
              Click to expand and see labor variables
            </div>
          )}
          {laborVariablesExpanded && (
            <div className="space-y-2 mb-4">
              {availableLaborVariables.map((lab) => {
                const laborProperties = getLaborFieldProperties
                  ? getLaborFieldProperties(lab.name)
                  : (lab.properties ?? []);

                return (
                  <FormulaExpandableVariable
                    key={lab.name}
                    label={lab.name}
                    value={lab.name}
                    isUsed={isVariableInFormula(lab.name, formula)}
                    onInsert={insertVariableAtCursor}
                    properties={laborProperties.map((prop) => ({
                      label: formatPropertyLabel(prop),
                      value: `${lab.name}.${prop.name}`,
                      isUsed: isPropertyReferenceInFormula(lab.name, prop.name, formula),
                    }))}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {!hasVariables && (
        <div className="text-center py-4 text-md-on-surface-variant text-sm">
          <p>Add fields, materials, or labor to use variables in your formula</p>
        </div>
      )}
    </>
  );
}
