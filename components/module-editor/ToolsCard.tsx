'use client';

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Material, Field } from '@/lib/types';

interface VariableInfo {
  name: string;
  label: string;
  type: string;
}

interface ToolsCardProps {
  fieldVariables: VariableInfo[];
  materialVariables: Array<{
    name: string;
    properties?: Array<{ id: string; name: string }>;
  }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onInsertVariable: (variable: string) => void;
  formula: string;
  fields: Field[];
  materials: Material[];
}

/**
 * Helper to check if a variable is in the formula
 */
function isVariableInFormula(varName: string, formula: string): boolean {
  const regex = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return regex.test(formula);
}

/**
 * Helper to check if a property reference is in the formula
 */
function isPropertyReferenceInFormula(baseVar: string, property: string, formula: string): boolean {
  const propertyRef = `${baseVar}.${property}`;
  return formula.includes(propertyRef);
}

/**
 * Get material field properties
 */
function getMaterialFieldProperties(fieldVarName: string, fields: Field[], materials: Material[]) {
  const field = fields.find(f => f.variableName === fieldVarName);
  if (!field || field.type !== 'material') return [];

  let candidateMaterials = materials;
  if (field.materialCategory && field.materialCategory.trim()) {
    candidateMaterials = materials.filter(m => m.category === field.materialCategory);
  }

  // Collect all unique properties from candidate materials
  const propertyMap = new Map<string, { id: string; name: string }>();
  candidateMaterials.forEach(material => {
    material.properties?.forEach(prop => {
      if (prop.type === 'number' && !propertyMap.has(prop.name)) {
        propertyMap.set(prop.name, { id: prop.id, name: prop.name });
      }
    });
  });

  return Array.from(propertyMap.values());
}

export const ToolsCard = React.memo(function ToolsCard({
  fieldVariables,
  materialVariables,
  searchQuery,
  onSearchChange,
  onInsertVariable,
  formula,
  fields,
  materials,
}: ToolsCardProps) {
  // Filter variables based on search
  const filteredFieldVariables = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return fieldVariables.filter(v => 
      v.name.toLowerCase().includes(searchLower) || v.label.toLowerCase().includes(searchLower)
    );
  }, [fieldVariables, searchQuery]);

  const filteredMaterialVariables = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return materialVariables.filter(m =>
      m.name.toLowerCase().includes(searchLower)
    );
  }, [materialVariables, searchQuery]);

  // Count used fields
  const usedFields = useMemo(() => {
    return filteredFieldVariables.filter(v => isVariableInFormula(v.name, formula)).length;
  }, [filteredFieldVariables, formula]);

  const allFields = filteredFieldVariables;

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-8 text-xs"
        />
      </div>

      {/* Field Variables Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field Variables</h4>
          <span className="text-[10px] text-muted-foreground">
            {usedFields}/{allFields.length}
          </span>
        </div>
        
        {filteredFieldVariables.length > 0 ? (
          <>
            {/* Grid layout for variables - single column when narrow to allow property stacking */}
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1.5">
              {filteredFieldVariables.map((varInfo) => {
                const isInFormula = isVariableInFormula(varInfo.name, formula);
                const isMaterialField = varInfo.type === 'material';
                
                return (
                  <button
                    key={varInfo.name}
                    type="button"
                    onClick={() => onInsertVariable(varInfo.name)}
                    className={cn(
                      "px-2 py-1.5 border rounded-lg text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 active:scale-[0.98] text-left flex items-center gap-1",
                      isInFormula 
                        ? "border-success bg-success/10 text-success hover:bg-success/20" 
                        : "border-border bg-background hover:bg-muted hover:border-accent/50"
                    )}
                  >
                    <span className="truncate flex-1 min-w-0">{varInfo.name}</span>
                    {isMaterialField && (
                      <span className="text-[10px] opacity-60 shrink-0">$</span>
                    )}
                    {isInFormula && (
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Material field properties */}
            {filteredFieldVariables.filter(v => v.type === 'material').map((varInfo) => {
              const fieldProperties = getMaterialFieldProperties(varInfo.name, fields, materials);
              if (fieldProperties.length === 0) return null;
              
              return (
                <div key={`${varInfo.name}-props`} className="mt-2 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground">{varInfo.name} properties:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1">
                    {fieldProperties.map((prop) => {
                      const propertyRef = `${varInfo.name}.${prop.name}`;
                      const isPropertyInFormula = isPropertyReferenceInFormula(varInfo.name, prop.name, formula);
                      return (
                        <button
                          key={prop.name}
                          type="button"
                          onClick={() => onInsertVariable(propertyRef)}
                          className={cn(
                            "px-2 py-1 border rounded text-[10px] font-mono transition-smooth focus:outline-none focus:ring-1 focus:ring-accent/50 active:scale-[0.98] text-left flex items-center gap-1",
                            isPropertyInFormula
                              ? "border-success bg-success/10 text-success"
                              : "border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="truncate flex-1 min-w-0">{propertyRef}</span>
                          {isPropertyInFormula && (
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            {searchQuery ? 'No matching variables' : 'Add fields to use variables'}
          </p>
        )}
      </div>

      {/* Material Fields Section */}
      {filteredFieldVariables.filter(v => v.type === 'material').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material Fields</h4>
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1.5">
            {filteredFieldVariables
              .filter(v => v.type === 'material')
              .map((varInfo) => {
                const isInFormula = isVariableInFormula(varInfo.name, formula);
                
                return (
                  <button
                    key={varInfo.name}
                    type="button"
                    onClick={() => onInsertVariable(varInfo.name)}
                    className={cn(
                      "px-2 py-1.5 border rounded-lg text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 active:scale-[0.98] text-left flex items-center gap-1",
                      isInFormula
                        ? "border-success bg-success/10 text-success hover:bg-success/20"
                        : "border-border bg-background hover:bg-muted hover:border-accent/50"
                    )}
                  >
                    <span className="truncate flex-1 min-w-0">{varInfo.name}</span>
                    <span className="text-[10px] opacity-60 shrink-0">$</span>
                    {isInFormula && (
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Material Catalog Section */}
      {filteredMaterialVariables.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material Catalog</h4>
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1.5">
            {filteredMaterialVariables.map((mat) => {
              const isMaterialInFormula = isVariableInFormula(mat.name, formula);
              return (
                <button
                  key={mat.name}
                  type="button"
                  onClick={() => onInsertVariable(mat.name)}
                  className={cn(
                    "px-2 py-1.5 border rounded-lg text-xs font-mono transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 active:scale-[0.98] text-left flex items-center gap-1",
                    isMaterialInFormula
                      ? "border-success bg-success/10 text-success hover:bg-success/20"
                      : "border-border bg-background hover:bg-muted hover:border-accent/50"
                  )}
                >
                  <span className="truncate flex-1 min-w-0">{mat.name}</span>
                  {isMaterialInFormula && (
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Material catalog properties */}
          {filteredMaterialVariables.filter(m => m.properties && m.properties.length > 0).map((mat) => (
            <div key={`${mat.name}-props`} className="mt-2 space-y-1.5">
              <p className="text-[10px] text-muted-foreground">{mat.name} properties:</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1">
                {mat.properties!.map((prop) => {
                  const propertyRef = `${mat.name}.${prop.name}`;
                  const isPropertyInFormula = isPropertyReferenceInFormula(mat.name, prop.name, formula);
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => onInsertVariable(propertyRef)}
                      className={cn(
                        "px-2 py-1 border rounded text-[10px] font-mono transition-smooth focus:outline-none focus:ring-1 focus:ring-accent/50 active:scale-[0.98] text-left flex items-center gap-1",
                        isPropertyInFormula
                          ? "border-success bg-success/10 text-success"
                          : "border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="truncate flex-1 min-w-0">{propertyRef}</span>
                      {isPropertyInFormula && (
                        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : filteredFieldVariables.filter(v => v.type === 'material').length === 0 && (
        <div>
          <p className="text-xs text-muted-foreground text-center py-4">
            {searchQuery ? 'No matching materials' : 'Add materials to use them in formulas'}
          </p>
        </div>
      )}
    </div>
  );
});

