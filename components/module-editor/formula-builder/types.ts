import type React from 'react';
import { AutocompleteSuggestion } from '@/hooks/use-formula-autocomplete';

export interface VariableInfo {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  materialCategory?: string;
  laborCategory?: string;
}

export interface MaterialVariableInfo {
  name: string;
  label: string;
  price: number;
  unit: string;
  properties: Array<{ id: string; name: string; unit?: string; unitSymbol?: string; type: string }>;
}

export interface LaborVariableInfo {
  name: string;
  label: string;
  cost: number;
  properties: Array<{ id: string; name: string; unitSymbol?: string; type: string }>;
}

export interface FormulaValidationState {
  valid: boolean;
  error?: string;
  preview?: number;
}

export interface FormulaWordInfo {
  word: string;
  start: number;
  end: number;
  hasDot: boolean;
  baseWord: string;
}

export interface FormulaAutocompleteProps {
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
}

export interface ComputedOutputVariable {
  variableName: string;
  label: string;
  unitSymbol?: string;
}

export type FieldPropertyInfo = {
  name: string;
  unit?: string;
  unitSymbol?: string;
  type: string;
};

export type LaborPropertyInfo = {
  name: string;
  unitSymbol?: string;
  type: string;
};
