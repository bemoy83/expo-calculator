/**
 * Computed Outputs Utilities
 * 
 * Validation, generation, and sanitization helpers for computed outputs.
 */

import { ComputedOutput, Field, CalculationModule } from '../types';
import { labelToVariableName } from '../utils';

/**
 * Generates a unique computed output variable name from a label
 * - Uses labelToVariableName as base
 * - Ensures uniqueness by appending number if needed
 * - Validates against 'out.' prefix
 */
function generateComputedOutputVariableName(
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
