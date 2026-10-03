import { Material, SharedFunction, Labor } from '../types';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  labor?: Labor[]; // Optional labor items
  // Optional: field definitions for validation (needed to identify material/labor fields and default values)
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; laborCategory?: string; defaultValue?: string | number | boolean }>;
  functions?: SharedFunction[]; // Available functions
}
