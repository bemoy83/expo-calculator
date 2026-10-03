import { Material, SharedFunction } from '../types';
import { mathInstance } from './math-runtime';
import { parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences } from './parser';
import { messageOf, translateParserError } from './error-messages';
import { findStandalone, NAME_WITH_PROPERTY, replaceStandalone } from './identifiers';

/**
 * What kind of problem an invalid formula has, for telling them apart on screen: "broken" can't be
 * read or called as written; "unresolved" is well formed but names something that doesn't exist
 * (yet). (Units that don't add up are a heads-up from lib/formula/unit-analysis, not a validation error.)
 */
export type FormulaErrorKind = 'broken' | 'unresolved';

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
  functions?: SharedFunction[]
): FormulaValidation {
  try {
    const availableFunctions = functions || [];
    const materialsByVariableName = new Map(materials.map(material => [material.variableName, material]));

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

    // A reference to a property of one of the available variables (a material parameter's `plate.width`)
    // is checked where it's used, not here.
    const fieldPropertyRefs = parseFieldPropertyReferences(formula, availableVariables);

    // Check material property references (e.g., mat_mdf.width)
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
    const matches = findStandalone(formula, NAME_WITH_PROPERTY);

    if (matches.length > 0) {
      const allAvailableVars = [
        ...availableVariables,
        ...materials.map(m => m.variableName),
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

      for (const match of matches) {
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

    // Use our custom math instance for validation
    mathInstance.evaluate(testFormula);

    return { valid: true };
  } catch (error) {
    // Translate technical parser errors into user-friendly messages
    const errorMessage = messageOf(error) || 'Invalid formula syntax';
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
