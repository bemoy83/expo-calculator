/**
 * Function Parameters Utilities
 * 
 * Validation and generation helpers for function parameters.
 */

import { labelToVariableName } from '../utils';

export interface FunctionParameter {
  name: string;
  label: string;
  unitCategory?: 'length' | 'area' | 'volume' | 'weight' | 'percentage' | 'count';
  unitSymbol?: string;
  required?: boolean;
}

/**
 * Generates a unique parameter name from a label
 * - Uses labelToVariableName as base
 * - Ensures uniqueness within the function's parameters
 * - Excludes the current parameter being edited
 */
export function generateParameterName(
  label: string,
  existingParameters: FunctionParameter[],
  excludeIndex?: number
): string {
  if (!label || !label.trim()) {
    return '';
  }

  const baseName = labelToVariableName(label);

  if (!baseName) {
    return '';
  }

  // Get existing parameter names, excluding the current one being edited
  const existingNames = existingParameters
    .map((p, index) => (index !== excludeIndex ? p.name.toLowerCase() : null))
    .filter((name): name is string => name !== null && name !== '');

  const allExistingNames = new Set(existingNames);

  // Check if base name is available
  if (!allExistingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  // Append number to make it unique
  let counter = 1;
  let candidate: string;
  do {
    candidate = `${baseName}_${counter}`;
    counter++;
  } while (allExistingNames.has(candidate.toLowerCase()) && counter < 1000);

  return candidate;
}

/**
 * Validates a parameter name
 * - Must be a valid identifier pattern
 * - Must be unique within the function's parameters
 */
export function validateParameterName(
  name: string,
  existingParameters: FunctionParameter[],
  excludeIndex?: number
): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Parameter name is required' };
  }

  const trimmedName = name.trim();

  // Check: valid identifier pattern
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
    return {
      valid: false,
      error: 'Parameter name must start with a letter or underscore and contain only letters, numbers, and underscores',
    };
  }

  // Check: unique within function parameters
  const existingNames = existingParameters
    .map((p, index) => (index !== excludeIndex ? p.name.toLowerCase() : null))
    .filter((name): name is string => name !== null && name !== '');

  if (existingNames.includes(trimmedName.toLowerCase())) {
    return { valid: false, error: 'Parameter name must be unique' };
  }

  return { valid: true };
}

