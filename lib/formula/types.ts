import { Material, SharedFunction, Labor } from '../types';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  labor?: Labor[]; // Optional labor items
  functions?: SharedFunction[]; // Available functions
}
