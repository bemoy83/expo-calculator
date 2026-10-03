import { Labor, Material, SharedFunction } from '../types';
import { mathInstance } from './math-runtime';
import { parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences } from './parser';
import { translateParserError } from './error-messages';
import { validateUnitCompatibility } from './unit-validation';
import { FormulaField } from './validation-types';
import { findStandalone, NAME, NAME_WITH_PROPERTY, replaceStandalone } from './identifiers';

export { analyzeFormulaVariables } from './debug-analysis';

function hasProperty(items: Array<{ properties?: Array<{ name: string }> }>, propertyName: string): boolean {
  return items.some(item => item.properties?.some(property => property.name === propertyName));
}

/**
 * What kind of problem an invalid formula has, for telling them apart on screen: "broken" can't be
 * read or called as written; "unresolved" is well formed but names something that doesn't exist
 * (yet); "units" mixes units that don't add up.
 */
export type FormulaErrorKind = 'broken' | 'unresolved' | 'units';

export interface FormulaValidation {
  valid: boolean;
  error?: string;
  errorKind?: FormulaErrorKind;
}

/**
 * Validates a formula syntax and checks if variables exist
 */
export function validateFormula(
  formula: string,
  availableVariables: string[],
  materials: Material[],
  fields?: FormulaField[],
  functions?: SharedFunction[],
  labor?: Labor[]
): FormulaValidation {
  try {
    const availableFunctions = functions || [];
    const materialsByVariableName = new Map(materials.map(material => [material.variableName, material]));
    const fieldsByVariableName = new Map((fields ?? []).map(field => [field.variableName, field]));

    const functionCalls = parseFunctionCalls(formula);
    const functionNames = new Set<string>();
    
    for (const call of functionCalls) {
      functionNames.add(call.functionName);
      
      // Find function definition
      const funcDef = availableFunctions.find(f => f.name === call.functionName);
      if (!funcDef) {
        return {
          valid: false,
          error: `Function '${call.functionName}' not found`,
          errorKind: 'unresolved'
        };
      }

      // Check parameter count
      if (call.arguments.length !== funcDef.parameters.length) {
        return {
          valid: false,
          error: `Function '${call.functionName}' expects ${funcDef.parameters.length} argument(s), but got ${call.arguments.length}`,
          errorKind: 'broken'
        };
      }
    }

    // First, check computed output references (out.variableName) - these must be checked BEFORE property references
    const computedOutputMatches = findStandalone(formula, `out\\.${NAME}`);
    for (const match of computedOutputMatches) {
      if (!availableVariables.includes(match)) {
        const outputName = match.replace('out.', '');
        return {
          valid: false,
          error: `Computed output '${outputName}' not found. Available computed outputs: ${availableVariables.filter(v => v.startsWith('out.')).map(v => v.replace('out.', '')).join(', ') || 'none'}`,
          errorKind: 'unresolved'
        };
      }
    }

    // Then, check field property references (e.g., wallboard.width)
    // Include field variable names from fields array, not just availableVariables
    // This ensures field property references are recognized even if the field doesn't have a value yet
    const allFieldVariableNames = [
      ...availableVariables,
      ...(fields?.map(f => f.variableName) || [])
    ];
    // Remove duplicates
    const uniqueFieldVariableNames = Array.from(new Set(allFieldVariableNames));
    const fieldPropertyRefs = parseFieldPropertyReferences(formula, uniqueFieldVariableNames);
    for (const ref of fieldPropertyRefs) {
      const field = fieldsByVariableName.get(ref.fieldVar);
      if (!field) {
        // Field not found in definitions - might be a regular variable, skip for now
        continue;
      }

      // Check if field is a material or labor field
      if (field.type !== 'material' && field.type !== 'labor') {
        return {
          valid: false,
          error: `Field "${ref.fieldVar}" is not a material or labor field, cannot access properties`,
          errorKind: 'broken'
        };
      }

      // Handle material fields
      if (field.type === 'material') {
        // Check if property exists on at least one material in the allowed category
        let candidateMaterials = materials;
        if (field.materialCategory && field.materialCategory.trim()) {
          candidateMaterials = materials.filter(m => m.category === field.materialCategory);
        }

        const propertyExists = hasProperty(candidateMaterials, ref.propertyName);

        if (!propertyExists) {
          const categoryMsg = field.materialCategory
            ? ` in category "${field.materialCategory}"`
            : '';
          return {
            valid: false,
            error: `Property "${ref.propertyName}" not found on any material${categoryMsg} for field "${ref.fieldVar}"`,
            errorKind: 'unresolved'
          };
        }
      }

      // Handle labor fields
      if (field.type === 'labor') {
        if (!labor || labor.length === 0) {
          return {
            valid: false,
            error: `No labor items available to check property "${ref.propertyName}" for field "${ref.fieldVar}"`,
            errorKind: 'unresolved'
          };
        }

        // Check if property exists on at least one labor item in the allowed category
        let candidateLabor = labor;
        if (field.laborCategory && field.laborCategory.trim()) {
          candidateLabor = labor.filter(l => l.category === field.laborCategory);
        }

        const propertyExists = hasProperty(candidateLabor, ref.propertyName);

        if (!propertyExists) {
          const categoryMsg = field.laborCategory
            ? ` in category "${field.laborCategory}"`
            : '';
          return {
            valid: false,
            error: `Property "${ref.propertyName}" not found on any labor item${categoryMsg} for field "${ref.fieldVar}"`,
            errorKind: 'unresolved'
          };
        }
      }
    }

    // Then, check material property references (e.g., mat_mdf.width)
    const materialPropertyRefs = parseMaterialPropertyReferences(formula);
    for (const ref of materialPropertyRefs) {
      // Skip if this was already handled as a field property reference
      if (fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)) {
        continue;
      }

      const material = materialsByVariableName.get(ref.materialVar);
      if (!material) {
        return {
          valid: false,
          error: `Material variable "${ref.materialVar}" not found`,
          errorKind: 'unresolved'
        };
      }

      if (!material.properties || !material.properties.find(p => p.name === ref.propertyName)) {
        return {
          valid: false,
          error: `Property "${ref.propertyName}" not found on material "${ref.materialVar}"`,
          errorKind: 'unresolved'
        };
      }
    }

    // Check for undefined variables (excluding property references)
    // First, collect all property reference parts that should NOT be treated as standalone variables
    const propertyParts = new Set<string>();
    const propertyBases = new Set<string>();

    // Collect property parts (the part after the dot) from all property references
    for (const ref of fieldPropertyRefs) {
      propertyParts.add(ref.propertyName);
      propertyBases.add(ref.fieldVar);
    }
    for (const ref of materialPropertyRefs) {
      // Only add if not already handled as field property reference
      if (!fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)) {
        propertyParts.add(ref.propertyName);
        propertyBases.add(ref.materialVar);
      }
    }

    // Now parse identifiers, excluding those that are property parts
    // Also parse computed output references (out.variableName) as single tokens
    const matches = findStandalone(formula, NAME_WITH_PROPERTY);
    
    // Separate computed output references from regular identifiers
    const regularMatches = matches.filter(m => !m.startsWith('out.'));

    if (matches.length > 0) {
      const allAvailableVars = [
        ...availableVariables,
        ...materials.map(m => m.variableName),
        // Include field variable names - they're valid variables even if not in availableVariables
        ...(fields?.map(f => f.variableName) || []),
        // Math functions and constants
        'sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e',
        // Rounding functions
        'round', 'ceil', 'floor'
      ];

      // Track which full property references exist (e.g., "wallboard.width")
      const allPropertyRefs = new Set([
        ...fieldPropertyRefs.map(ref => ref.fullMatch),
        ...materialPropertyRefs.map(ref => ref.fullMatch)
      ]);

      // Collect ALL available function names (not just ones found in calls)
      // This ensures function names are excluded from undefined variable check
      const allFunctionNames = new Set([
        ...functionNames, // Function names from calls in this formula
        ...availableFunctions.map(f => f.name) // All available function names from store
      ]);

      // Skip computed output references - they're already validated earlier in the function
      // Filter them out from regularMatches to avoid duplicate checks
      const regularMatchesWithoutComputedOutputs = regularMatches.filter(m => !m.startsWith('out.'));

      for (const match of regularMatchesWithoutComputedOutputs) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;

        // Skip if it's a math function or constant
        if (['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'].includes(match)) {
          continue;
        }

        // Skip if it's ANY user-defined function name (not just ones in calls)
        if (allFunctionNames.has(match)) {
          continue;
        }

        // Skip if this identifier is part of a computed output reference (out.variableName)
        // Computed outputs are stored in fieldValues with 'out.' prefix
        if (match === 'out') {
          // Check if 'out' is followed by a dot and variable name (e.g., "out.area")
          if (findStandalone(formula, `out\\.${NAME}`).length > 0) {
            // 'out' is part of a computed output reference, skip it
            continue;
          }
        }

        // Skip if this identifier is a full property reference (e.g., "material.width")
        // Property references are already validated separately
        if (allPropertyRefs.has(match)) {
          continue;
        }

        // Skip if this identifier is part of a property reference (e.g., "wallboard" or "width" in "wallboard.width")
        // We need to check if this match appears as part of any property reference
        let isPartOfPropertyRef = false;
        for (const propRef of allPropertyRefs) {
          // Check if match is the base part (before dot) or property part (after dot)
          const parts = propRef.split('.');
          if (parts.length === 2 && (parts[0] === match || parts[1] === match)) {
            // Always skip the property part (after dot) - it's never a standalone variable
            if (parts[1] === match) {
              isPartOfPropertyRef = true;
              break;
            }
            // For the base part (before dot): skip it if it's not in allAvailableVars
            // This means it's only used as part of property references, not as a standalone variable
            if (parts[0] === match && !allAvailableVars.includes(match)) {
              isPartOfPropertyRef = true;
              break;
            }
          }
        }

        if (isPartOfPropertyRef) {
          continue;
        }

        // Check if this is a valid variable
        if (!allAvailableVars.includes(match)) {
          return {
            valid: false,
            error: `Undefined variable: ${match}`,
            errorKind: 'unresolved'
          };
        }
      }
    }

    // Replace all variables with 1 for syntax check
    let testFormula = formula;

    // Replace property references first
    for (const ref of fieldPropertyRefs) {
      testFormula = replaceStandalone(testFormula, ref.fullMatch, '1');
    }
    for (const ref of materialPropertyRefs) {
      // Skip if already processed as field property reference
      if (!fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)) {
        testFormula = replaceStandalone(testFormula, ref.fullMatch, '1');
      }
    }

    // Replace function calls with dummy values
    // Process from right to left to maintain correct indices
    const sortedCalls = [...functionCalls].sort((a, b) => b.startIndex - a.startIndex);
    for (const call of sortedCalls) {
      // Replace by position instead of regex (more reliable with parentheses)
      testFormula = 
        testFormula.slice(0, call.startIndex) +
        '1' +
        testFormula.slice(call.endIndex);
    }

    // Replace regular variables
    const allVars = [...availableVariables, ...materials.map(m => m.variableName)];
    for (const varName of allVars) {
      // It's safe to always try replacing here:
      // - We already replaced full property refs like "wallboard.width" above.
      // - A standalone match won't touch "wallboard" inside "wallboard_2"; property refs are gone.
      testFormula = replaceStandalone(testFormula, varName, '1');
    }

    // Phase 1: Unit compatibility validation
    const unitValidationError = validateUnitCompatibility(
      formula,
      fieldPropertyRefs,
      materialPropertyRefs,
      availableVariables,
      materials,
      fields
    );
    if (unitValidationError) {
      return {
        valid: false,
        error: unitValidationError,
        errorKind: 'units'
      };
    }

    // Use our custom math instance for validation
    mathInstance.evaluate(testFormula);

    return { valid: true };
  } catch (error: any) {
    // Translate technical parser errors into user-friendly messages
    const errorMessage = error.message || 'Invalid formula syntax';
    const translatedError = translateParserError(errorMessage, formula);

    // An unknown function is a missing name; anything else the parser stumbles on is the formula itself.
    const unresolved = /Undefined function|Function .* not found|Unknown function/.test(errorMessage);

    return {
      valid: false,
      error: translatedError,
      errorKind: unresolved ? 'unresolved' : 'broken'
    };
  }
}
