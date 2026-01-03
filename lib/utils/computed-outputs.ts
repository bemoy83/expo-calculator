/**
 * Computed Outputs Utilities
 * 
 * Validation, generation, and sanitization helpers for computed outputs.
 */

import { ComputedOutput, Field, SharedFunction, CalculationModule, Material } from '../types';
import { labelToVariableName } from '../utils';
import { validateFormula } from '../formula-evaluator';
import { useFunctionsStore } from '../stores/functions-store';

/**
 * Validates a computed output variable name
 * - Must not start with 'out.' (reserved namespace)
 * - Must be a valid identifier pattern
 * - Must be unique within module (not in existing outputs or fields)
 */
export function validateComputedOutputVariableName(
  name: string,
  existingOutputs: ComputedOutput[],
  existingFields: Field[]
): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Variable name is required' };
  }

  const trimmedName = name.trim();

  // Check: doesn't start with 'out.'
  if (trimmedName.startsWith('out.')) {
    return { valid: false, error: "Variable name cannot start with 'out.'" };
  }

  // Check: valid identifier pattern
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
    return {
      valid: false,
      error: 'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    };
  }

  // Check: unique within module
  const existingOutputNames = existingOutputs.map((o) => o.variableName.toLowerCase());
  const existingFieldNames = existingFields.map((f) => f.variableName.toLowerCase());

  if (existingOutputNames.includes(trimmedName.toLowerCase())) {
    return { valid: false, error: 'Variable name must be unique (already used by another computed output)' };
  }

  if (existingFieldNames.includes(trimmedName.toLowerCase())) {
    return { valid: false, error: 'Variable name must be unique (already used by a field)' };
  }

  return { valid: true };
}

/**
 * Generates a unique computed output variable name from a label
 * - Uses labelToVariableName as base
 * - Ensures uniqueness by appending number if needed
 * - Validates against 'out.' prefix
 */
export function generateComputedOutputVariableName(
  label: string,
  existingOutputs: ComputedOutput[],
  existingFields: Field[]
): string {
  if (!label || !label.trim()) {
    return '';
  }

  const baseName = labelToVariableName(label);

  if (!baseName) {
    return '';
  }

  // Ensure it doesn't start with 'out.'
  let candidate = baseName.startsWith('out.') ? `_${baseName}` : baseName;

  // Check uniqueness
  const existingOutputNames = existingOutputs.map((o) => o.variableName.toLowerCase());
  const existingFieldNames = existingFields.map((f) => f.variableName.toLowerCase());
  const allExistingNames = new Set([...existingOutputNames, ...existingFieldNames]);

  if (!allExistingNames.has(candidate.toLowerCase())) {
    return candidate;
  }

  // Append number to make it unique
  let counter = 1;
  do {
    candidate = `${baseName}_${counter}`;
    counter++;
  } while (allExistingNames.has(candidate.toLowerCase()) && counter < 1000);

  return candidate;
}

/**
 * Validates a computed output expression
 * - Uses existing validateFormula
 * - Allows references to previously defined computed outputs (by variable name, not out.variableName)
 * - Prevents references to computed outputs defined AFTER this one (circular/forward references)
 * - Returns clear error if invalid computed output reference detected
 */
export function validateComputedOutputExpression(
  expression: string,
  fields: Field[],
  computedOutputs: ComputedOutput[],
  functions: SharedFunction[],
  materials: Material[], // Materials needed to validate field property references
  currentOutputId?: string // ID of the output being validated (to check order)
): { valid: boolean; error?: string; warnings?: string[] } {
  if (!expression || !expression.trim()) {
    return { valid: false, error: 'Expression is required' };
  }

  // Check for computed output references with 'out.' prefix (invalid - use variable name directly)
  const computedOutputRefRegex = /\bout\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches = expression.match(computedOutputRefRegex);
  
  if (matches && matches.length > 0) {
    const referencedOutputs = matches.map((match) => match.replace('out.', ''));
    return {
      valid: false,
      error: `Expression cannot use 'out.' prefix. Reference computed outputs by their variable name directly (e.g., '${referencedOutputs[0]}' instead of 'out.${referencedOutputs[0]}').`,
    };
  }

  // Check for computed output variable names - allow if they're defined BEFORE this one
  const computedOutputNames = computedOutputs.map((o) => o.variableName.toLowerCase());
  const fieldVariableNames = fields.map((f) => f.variableName.toLowerCase());
  const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const variableMatches = expression.match(variableRegex) || [];
  
  // Find index of current output (if provided) to check order
  const currentOutputIndex = currentOutputId 
    ? computedOutputs.findIndex((o) => o.id === currentOutputId)
    : -1;
  
  for (const match of variableMatches) {
    // Skip if it's a number
    if (!isNaN(Number(match))) continue;
    // Skip if it's a math function
    const mathFunctions = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'];
    if (mathFunctions.includes(match)) continue;
    // Skip if it's a function name
    if (functions.some((f) => f.name === match)) continue;
    // Skip if it's a field variable (fields are valid to reference and take precedence)
    if (fieldVariableNames.includes(match.toLowerCase())) continue;
    
    // Check if it's a computed output name
    const matchIndex = computedOutputs.findIndex((o) => o.variableName.toLowerCase() === match.toLowerCase());
    if (matchIndex !== -1) {
      // It's a computed output - check if it's defined before the current one
      if (currentOutputIndex !== -1 && matchIndex >= currentOutputIndex) {
        // Forward reference or self-reference - invalid
        return {
          valid: false,
          error: `Expression cannot reference computed output '${match}' because it is defined after this one or is the same output. Computed outputs can only reference previously defined computed outputs.`,
        };
      }
      // Valid reference to a previously defined computed output
      continue;
    }
  }

  // Build available variables: fields + previously defined computed outputs
  const availableVariables = fields.map((f) => f.variableName);
  
  // Add previously defined computed outputs (those defined before current one)
  if (currentOutputId !== undefined && currentOutputIndex !== -1) {
    for (let i = 0; i < currentOutputIndex; i++) {
      availableVariables.push(computedOutputs[i].variableName);
    }
  } else if (currentOutputId === undefined) {
    // If no current output ID provided, allow all computed outputs (for backward compatibility)
    computedOutputs.forEach((o) => {
      if (!availableVariables.includes(o.variableName)) {
        availableVariables.push(o.variableName);
      }
    });
  }
  
  const fieldDefinitions = fields.map((f) => ({
    variableName: f.variableName,
    type: f.type,
    materialCategory: f.materialCategory,
  }));

  const validation = validateFormula(
    expression,
    availableVariables,
    materials, // Pass materials to validate field property references
    fieldDefinitions,
    functions
  );

  return validation;
}

/**
 * Sanitizes a legacy module by checking for fields with variableName starting with 'out.'
 * - Auto-renames: out.area → _out_area
 * - Logs warning
 * - Returns sanitized module
 */
export function sanitizeLegacyModule(module: CalculationModule): CalculationModule {
  let hasChanges = false;
  const sanitizedFields = module.fields.map((field) => {
    if (field.variableName.startsWith('out.')) {
      hasChanges = true;
      const newName = `_${field.variableName.replace(/^out\./, 'out_')}`;
      console.warn(
        `Module '${module.name}' has field '${field.variableName}' - renamed to '${newName}' (out. prefix is reserved for computed outputs)`
      );
      return {
        ...field,
        variableName: newName,
      };
    }
    return field;
  });

  if (hasChanges) {
    return {
      ...module,
      fields: sanitizedFields,
      updatedAt: new Date().toISOString(),
    };
  }

  return module;
}

/**
 * Regenerates computed output variable names from labels
 * - Ensures uniqueness
 * - Validates against 'out.' prefix
 * - Useful when loading modules or updating computed output library
 */
export function regenerateComputedOutputVariableNames(
  module: CalculationModule
): CalculationModule {
  if (!module.computedOutputs || module.computedOutputs.length === 0) {
    return module;
  }

  const regeneratedOutputs = module.computedOutputs.map((output, index) => {
    const newVariableName = generateComputedOutputVariableName(
      output.label,
      module.computedOutputs!.slice(0, index), // Only check previous outputs
      module.fields
    );

    if (newVariableName !== output.variableName) {
      return {
        ...output,
        variableName: newVariableName,
      };
    }

    return output;
  });

  // Check if any changes were made
  const hasChanges = regeneratedOutputs.some(
    (output, index) => output.variableName !== module.computedOutputs![index].variableName
  );

  if (hasChanges) {
    return {
      ...module,
      computedOutputs: regeneratedOutputs,
      updatedAt: new Date().toISOString(),
    };
  }

  return module;
}

