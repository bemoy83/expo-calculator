import { UnitCategory } from '../units';

export type FormulaField = {
  variableName: string;
  type: string;
  materialCategory?: string;
  laborCategory?: string;
  dropdownMode?: 'numeric' | 'string';
  unitCategory?: UnitCategory;
  unitSymbol?: string;
};
