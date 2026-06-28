import { Material, SharedFunction, Labor } from '../types';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  labor?: Labor[]; // Optional labor items
  // Optional: field definitions for validation (needed to identify material/labor fields and default values)
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; laborCategory?: string; defaultValue?: string | number | boolean }>;
  functionOutputs?: Record<string, number>; // Pre-computed function outputs (for linked functions)
  functions?: SharedFunction[]; // Available functions
}

export type FormulaDebugInfo = {
  fieldPropertyRefs: Array<{ full: string; fieldVar: string; property: string }>;
  materialPropertyRefs: Array<{ full: string; materialVar: string; property: string }>;
  variables: string[];
  computedOutputs: string[]; // Computed outputs (out.variableName)
  mathFunctions: string[];
  functionCalls: Array<{ name: string; arguments: string[]; fullMatch: string }>;
  unknownVariables: string[];
};
