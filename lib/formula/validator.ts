import { Labor, Material, SharedFunction } from '../types';
import { UnitCategory, divideUnits, getUnitCategory } from '../units';
import { EvaluationContext, FormulaDebugInfo } from './types';
import { mathInstance } from './math-runtime';
import { MATH_FUNCTIONS, escapeRegex, parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences } from './parser';

function validateUnitCompatibility(
  formula: string,
  fieldPropertyRefs: Array<{ fieldVar: string; propertyName: string; fullMatch: string }>,
  materialPropertyRefs: Array<{ materialVar: string; propertyName: string; fullMatch: string }>,
  availableVariables: string[],
  materials: Material[],
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; dropdownMode?: 'numeric' | 'string'; unitCategory?: UnitCategory; unitSymbol?: string }>
): string | null {
  // Collect unit categories for all variables/properties
  const variableUnits = new Map<string, UnitCategory>();

  // Track field property references
  for (const ref of fieldPropertyRefs) {
    // Find the field to get material category
    const field = fields?.find(f => f.variableName === ref.fieldVar);
    if (field && field.type === 'material') {
      // Find a material in the allowed category to get property unit
      let candidateMaterials = materials;
      if (field.materialCategory && field.materialCategory.trim()) {
        candidateMaterials = materials.filter(m => m.category === field.materialCategory);
      }

      for (const material of candidateMaterials) {
        const property = material.properties?.find(p => p.name === ref.propertyName);
        if (property) {
          const unitCat = property.unitCategory || (property.unitSymbol ? getUnitCategory(property.unitSymbol) : undefined);
          if (unitCat) {
            variableUnits.set(ref.fullMatch, unitCat);
            break;
          }
        }
      }
    }
  }

  // Track material property references
  for (const ref of materialPropertyRefs) {
    const material = materials.find(m => m.variableName === ref.materialVar);
    if (material) {
      const property = material.properties?.find(p => p.name === ref.propertyName);
      if (property) {
        const unitCat = property.unitCategory || (property.unitSymbol ? getUnitCategory(property.unitSymbol) : undefined);
        if (unitCat) {
          variableUnits.set(ref.fullMatch, unitCat);
        }
      }
    }
  }

  // Track field variables
  for (const varName of availableVariables) {
    const field = fields?.find(f => f.variableName === varName);
    if (field && (
      field.type === 'number' ||
      (field.type === 'dropdown' && field.dropdownMode === 'numeric')
    )) {
      const unitCat = field.unitCategory || (field.unitSymbol ? getUnitCategory(field.unitSymbol) : undefined);
      if (unitCat) {
        variableUnits.set(varName, unitCat);
      }
    }
  }

  // Phase 1: Simple pattern-based validation
  // Check for addition/subtraction of incompatible units
  // Pattern: variable1 + variable2 or variable1 - variable2
  const addSubPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g;
  let match;
  while ((match = addSubPattern.exec(formula)) !== null) {
    const var1 = match[1];
    const var2 = match[3];
    const unit1 = variableUnits.get(var1);
    const unit2 = variableUnits.get(var2);

    // If both have units and they're different (and not unitless), error
    if (unit1 && unit2 && unit1 !== unit2) {
      // Allow unitless (count/percentage) to be added/subtracted with anything
      if (unit1 !== 'count' && unit1 !== 'percentage' && unit2 !== 'count' && unit2 !== 'percentage') {
        return `Cannot ${match[2] === '+' ? 'add' : 'subtract'} ${unit1} (${var1}) to ${unit2} (${var2})`;
      }
    }
  }

  // Check division rules
  // Pattern: variable1 / variable2
  const divPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\/\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/g;
  while ((match = divPattern.exec(formula)) !== null) {
    const var1 = match[1];
    const var2 = match[2];
    const unit1 = variableUnits.get(var1);
    const unit2 = variableUnits.get(var2);

    if (unit1 && unit2) {
      const resultUnit = divideUnits(unit1, unit2);
      if (resultUnit === null) {
        // Check specific error cases
        // Unitless ÷ unit → disallow
        if ((unit1 === 'count' || unit1 === 'percentage') && unit2 !== 'count' && unit2 !== 'percentage') {
          return `Cannot divide unitless (${var1}) by ${unit2} (${var2})`;
        }
        // Different dimensional units → disallow
        if (unit1 !== unit2 && unit1 !== 'count' && unit1 !== 'percentage' && unit2 !== 'count' && unit2 !== 'percentage') {
          return `Cannot divide ${unit1} (${var1}) by ${unit2} (${var2})`;
        }
      }
    }
  }

  return null;
}

/**
 * Translates technical parser errors into user-friendly messages
 */
function translateParserError(errorMessage: string, formula: string): string {
  // Extract character position if available
  const charMatch = errorMessage.match(/\(char (\d+)\)/);
  const charPos = charMatch ? parseInt(charMatch[1], 10) : null;

  // Get context around the error position
  let context = '';
  if (charPos !== null && charPos < formula.length) {
    const start = Math.max(0, charPos - 10);
    const end = Math.min(formula.length, charPos + 10);
    const before = formula.substring(start, charPos);
    const at = formula[charPos];
    const after = formula.substring(charPos + 1, end);
    context = ` near "${before}${at}${after}"`;
  }

  // Common error patterns and their translations
  if (errorMessage.includes('Unexpected part')) {
    const partMatch = errorMessage.match(/Unexpected part "([^"]+)"/);
    const part = partMatch ? partMatch[1] : 'character';

    // Check for common issues
    if (part === '1' || part.match(/^\d+$/)) {
      return `Syntax error${context}: Unexpected number. Check for missing operators (+, -, *, /) between values.`;
    }
    if (part.match(/^[a-zA-Z_]/)) {
      return `Syntax error${context}: Unexpected variable or function. Check for missing operators or invalid function names.`;
    }
    if (['(', ')', '+', '-', '*', '/'].includes(part)) {
      return `Syntax error${context}: Unexpected "${part}". Check for mismatched parentheses or missing values.`;
    }
    return `Syntax error${context}: Unexpected "${part}". Check your formula syntax.`;
  }

  if (errorMessage.includes('Unexpected end of expression')) {
    return `Formula is incomplete${context}. Check for missing values or operators at the end.`;
  }

  if (errorMessage.includes('Unexpected operator')) {
    return `Syntax error${context}: Unexpected operator. Check for missing values before or after operators.`;
  }

  if (errorMessage.includes('Parenthesis')) {
    if (errorMessage.includes('missing')) {
      return `Missing closing parenthesis${context}. Check that all opening parentheses "(" have matching closing ones ")".`;
    }
    if (errorMessage.includes('unexpected')) {
      return `Unexpected closing parenthesis${context}. Check for extra ")" or missing opening "(".`;
    }
  }

  if (errorMessage.includes('Function') && errorMessage.includes('not found')) {
    const funcMatch = errorMessage.match(/Function "([^"]+)" not found/);
    const funcName = funcMatch ? funcMatch[1] : 'function';
    return `Unknown function "${funcName}". Available functions: round, ceil, floor, sqrt, abs, max, min, sin, cos, tan, log, exp.`;
  }

  if (errorMessage.includes('Undefined variable')) {
    return errorMessage; // Already user-friendly
  }

  // For other errors, provide a helpful message with context
  return `Formula syntax error${context}: ${errorMessage}. Check that your formula uses valid operators (+, -, *, /) and proper parentheses.`;
}

/**
 * Validates a formula syntax and checks if variables exist
 */
export function validateFormula(
  formula: string,
  availableVariables: string[],
  materials: Material[],
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; laborCategory?: string; dropdownMode?: 'numeric' | 'string'; unitCategory?: UnitCategory; unitSymbol?: string }>,
  functions?: SharedFunction[],
  labor?: Labor[]
): { valid: boolean; error?: string; warnings?: string[] } {
  try {
    const warnings: string[] = [];
    const availableFunctions = functions || [];

    // STEP 0: Validate function calls
    const functionCalls = parseFunctionCalls(formula);
    const functionNames = new Set<string>();
    
    for (const call of functionCalls) {
      functionNames.add(call.functionName);
      
      // Find function definition
      const funcDef = availableFunctions.find(f => f.name === call.functionName);
      if (!funcDef) {
        return {
          valid: false,
          error: `Function '${call.functionName}' not found`
        };
      }

      // Check parameter count
      if (call.arguments.length !== funcDef.parameters.length) {
        return {
          valid: false,
          error: `Function '${call.functionName}' expects ${funcDef.parameters.length} argument(s), but got ${call.arguments.length}`
        };
      }

      // Check parameter variables exist
      const allAvailableVars = [
        ...availableVariables,
        ...materials.map(m => m.variableName),
      ];

      // Collect all available function names for nested function call detection
      const allFunctionNames = new Set(
        availableFunctions.map(f => f.name)
      );

      for (let i = 0; i < call.arguments.length; i++) {
        const argVar = call.arguments[i];
        
        // Skip if it's a number literal
        if (!isNaN(Number(argVar)) && isFinite(Number(argVar))) {
          continue;
        }
        
        // Check if argument is itself a nested function call (e.g., func1(x))
        const nestedFunctionCalls = parseFunctionCalls(argVar);
        if (nestedFunctionCalls.length > 0) {
          // Validate nested function call recursively
          // First check if the nested function exists
          const nestedFuncName = nestedFunctionCalls[0].functionName;
          const nestedFuncDef = availableFunctions.find(f => f.name === nestedFuncName);
          
          if (!nestedFuncDef) {
            warnings.push(
              `Function '${call.functionName}' parameter '${funcDef.parameters[i].name}' uses nested function '${nestedFuncName}' which is not found`
            );
            continue;
          }
          
          // Check parameter count for nested function
          if (nestedFunctionCalls[0].arguments.length !== nestedFuncDef.parameters.length) {
            warnings.push(
              `Nested function '${nestedFuncName}' in '${call.functionName}' parameter '${funcDef.parameters[i].name}' expects ${nestedFuncDef.parameters.length} argument(s), but got ${nestedFunctionCalls[0].arguments.length}`
            );
            continue;
          }
          
          // Recursively validate the nested function call's arguments
          // Validate each argument of the nested function call
          for (let j = 0; j < nestedFunctionCalls[0].arguments.length; j++) {
            const nestedArg = nestedFunctionCalls[0].arguments[j];
            
            // Skip if nested argument is a number literal
            if (!isNaN(Number(nestedArg)) && isFinite(Number(nestedArg))) {
              continue;
            }
            
            // Check if nested argument is itself a function call (deep nesting)
            const deepNestedCalls = parseFunctionCalls(nestedArg);
            if (deepNestedCalls.length > 0) {
              // For deep nesting, just check if the function exists
              const deepFuncName = deepNestedCalls[0].functionName;
              if (!allFunctionNames.has(deepFuncName)) {
                warnings.push(
                  `Deeply nested function '${deepFuncName}' in '${nestedFuncName}' argument '${nestedFuncDef.parameters[j].name}' is not found`
                );
              }
              continue; // Skip allAvailableVars check for nested function calls
            }
            
            // Regular variable check for nested function arguments
            // These should be available in the outer function's context (parameters or materials)
            if (!allAvailableVars.includes(nestedArg)) {
              warnings.push(
                `Nested function '${nestedFuncName}' argument '${nestedFuncDef.parameters[j].name}' uses variable '${nestedArg}' which may not be available in the outer function context`
              );
            }
          }
          
          continue; // Skip the allAvailableVars check for the nested function call itself
        }
        
        // Regular variable check (not a nested function call)
        if (!allAvailableVars.includes(argVar)) {
          warnings.push(
            `Function '${call.functionName}' parameter '${funcDef.parameters[i].name}' uses variable '${argVar}' which may not be available`
          );
        }
      }
    }

    // First, check computed output references (out.variableName) - these must be checked BEFORE property references
    const computedOutputRefRegex = /\bout\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const computedOutputMatches = formula.match(computedOutputRefRegex) || [];
    for (const match of computedOutputMatches) {
      if (!availableVariables.includes(match)) {
        const outputName = match.replace('out.', '');
        return {
          valid: false,
          error: `Computed output '${outputName}' not found. Available computed outputs: ${availableVariables.filter(v => v.startsWith('out.')).map(v => v.replace('out.', '')).join(', ') || 'none'}`,
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
      // Find the field definition
      const field = fields?.find(f => f.variableName === ref.fieldVar);
      if (!field) {
        // Field not found in definitions - might be a regular variable, skip for now
        continue;
      }

      // Check if field is a material or labor field
      if (field.type !== 'material' && field.type !== 'labor') {
        return {
          valid: false,
          error: `Field "${ref.fieldVar}" is not a material or labor field, cannot access properties`
        };
      }

      // Handle material fields
      if (field.type === 'material') {
        // Check if property exists on at least one material in the allowed category
        let candidateMaterials = materials;
        if (field.materialCategory && field.materialCategory.trim()) {
          candidateMaterials = materials.filter(m => m.category === field.materialCategory);
        }

        const hasProperty = candidateMaterials.some(material =>
          material.properties && material.properties.some(p => p.name === ref.propertyName)
        );

        if (!hasProperty) {
          const categoryMsg = field.materialCategory
            ? ` in category "${field.materialCategory}"`
            : '';
          return {
            valid: false,
            error: `Property "${ref.propertyName}" not found on any material${categoryMsg} for field "${ref.fieldVar}"`
          };
        }
      }

      // Handle labor fields
      if (field.type === 'labor') {
        if (!labor || labor.length === 0) {
          return {
            valid: false,
            error: `No labor items available to check property "${ref.propertyName}" for field "${ref.fieldVar}"`
          };
        }

        // Check if property exists on at least one labor item in the allowed category
        let candidateLabor = labor;
        if (field.laborCategory && field.laborCategory.trim()) {
          candidateLabor = labor.filter(l => l.category === field.laborCategory);
        }

        const hasProperty = candidateLabor.some(laborItem =>
          laborItem.properties && laborItem.properties.some(p => p.name === ref.propertyName)
        );

        if (!hasProperty) {
          const categoryMsg = field.laborCategory
            ? ` in category "${field.laborCategory}"`
            : '';
          return {
            valid: false,
            error: `Property "${ref.propertyName}" not found on any labor item${categoryMsg} for field "${ref.fieldVar}"`
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

      const material = materials.find((m) => m.variableName === ref.materialVar);
      if (!material) {
        return {
          valid: false,
          error: `Material variable "${ref.materialVar}" not found`
        };
      }

      if (!material.properties || !material.properties.find(p => p.name === ref.propertyName)) {
        return {
          valid: false,
          error: `Property "${ref.propertyName}" not found on material "${ref.materialVar}"`
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
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
    const matches = formula.match(variableRegex) || [];
    
    // Separate computed output references from regular identifiers
    const computedOutputRefs = matches.filter(m => m.startsWith('out.'));
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
          const outPattern = /\bout\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
          const outMatches = formula.match(outPattern);
          if (outMatches && outMatches.length > 0) {
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
            error: `Undefined variable: ${match}`
          };
        }
      }
    }

    // Test evaluation with dummy values
    const testContext: EvaluationContext = {
      fieldValues: {},
      materials: materials.map(m => ({
        ...m,
        price: 1,
        properties: m.properties?.map(p => ({
          ...p,
          value: p.type === 'number' ? 1 : p.type === 'boolean' ? true : '1'
        }))
      }))
    };

    // Replace all variables with 1 for syntax check
    let testFormula = formula;

    // Replace property references first
    for (const ref of fieldPropertyRefs) {
      const regex = new RegExp(`\\b${escapeRegex(ref.fullMatch)}\\b`, 'g');
      testFormula = testFormula.replace(regex, '1');
    }
    for (const ref of materialPropertyRefs) {
      // Skip if already processed as field property reference
      if (!fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)) {
        const regex = new RegExp(`\\b${escapeRegex(ref.fullMatch)}\\b`, 'g');
        testFormula = testFormula.replace(regex, '1');
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
      // - The regex uses word boundaries, so it won't touch "wallboard" inside "wallboard.width".
      const regex = new RegExp(`\\b${escapeRegex(varName)}\\b`, 'g');
      testFormula = testFormula.replace(regex, '1');
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
        error: unitValidationError
      };
    }

    // Use our custom math instance for validation
    mathInstance.evaluate(testFormula);

    return warnings.length > 0 
      ? { valid: true, warnings }
      : { valid: true };
  } catch (error: any) {
    // Translate technical parser errors into user-friendly messages
    const errorMessage = error.message || 'Invalid formula syntax';
    const translatedError = translateParserError(errorMessage, formula);

    return {
      valid: false,
      error: translatedError
    };
  }
}

/**
 * Analyzes a formula to extract variable information for debugging
 * Returns detailed information about detected variables, property references, and unknown identifiers
 * This matches the parsing logic used in validateFormula exactly
 */
export function analyzeFormulaVariables(
  formula: string,
  availableVariables: string[],
  materials: Material[],
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; dropdownMode?: 'numeric' | 'string'; unitCategory?: UnitCategory; unitSymbol?: string }>,
  functions?: SharedFunction[]
): FormulaDebugInfo {
  const mathFunctionsList = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'];
  const availableFunctions = functions || [];

  // Parse function calls to get function names
  const functionCalls = parseFunctionCalls(formula);
  const functionNames = new Set<string>();
  const functionCallsFormatted: Array<{ name: string; arguments: string[]; fullMatch: string }> = [];
  functionCalls.forEach(call => {
    functionNames.add(call.functionName);
    functionCallsFormatted.push({
      name: call.functionName,
      arguments: call.arguments,
      fullMatch: call.fullMatch,
    });
  });

  // Parse property references using same logic as validateFormula
  const fieldPropertyRefs = parseFieldPropertyReferences(formula, availableVariables);
  const materialPropertyRefs = parseMaterialPropertyReferences(formula);

  // Filter out material property refs that were already handled as field property refs
  const filteredMaterialPropertyRefs = materialPropertyRefs.filter(ref =>
    !fieldPropertyRefs.some(fpr => fpr.fullMatch === ref.fullMatch)
  );

  // Format property references for debug output
  const fieldPropertyRefsFormatted = fieldPropertyRefs.map(ref => ({
    full: ref.fullMatch,
    fieldVar: ref.fieldVar,
    property: ref.propertyName,
  }));

  const materialPropertyRefsFormatted = filteredMaterialPropertyRefs.map(ref => ({
    full: ref.fullMatch,
    materialVar: ref.materialVar,
    property: ref.propertyName,
  }));

  // Parse all identifiers using same regex as validation
  // Also parse computed output references (out.variableName) as single tokens
  const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
  const matches = formula.match(variableRegex) || [];
  
  // Separate computed output references from regular identifiers
  const computedOutputRefs = matches.filter(m => m.startsWith('out.'));
  const regularMatches = matches.filter(m => !m.startsWith('out.'));

  // Track which full property references exist
  const allPropertyRefs = new Set([
    ...fieldPropertyRefs.map(ref => ref.fullMatch),
    ...filteredMaterialPropertyRefs.map(ref => ref.fullMatch)
  ]);

  // Collect all available variables (including computed outputs with 'out.' prefix)
  const allAvailableVars = [
    ...availableVariables,
    ...materials.map(m => m.variableName),
    ...mathFunctionsList
  ];

  // Collect ALL function names (from calls + available functions)
  const allFunctionNames = new Set([
    ...functionNames, // Function names from calls in this formula
    ...availableFunctions.map(f => f.name) // All available function names from store
  ]);

  const variables: string[] = [];
  const computedOutputs: string[] = [];
  const mathFunctions: string[] = [];
  const unknownVariables: string[] = [];
  
  // Add computed output references to computedOutputs array (separate from regular variables)
  computedOutputRefs.forEach(ref => {
    if (allAvailableVars.includes(ref)) {
      computedOutputs.push(ref);
    } else {
      unknownVariables.push(ref);
    }
  });

  for (const match of regularMatches) {
    // Skip if it's a number
    if (!isNaN(Number(match))) continue;

    // Check if it's a math function
    if (mathFunctionsList.includes(match)) {
      mathFunctions.push(match);
      continue;
    }

    // Skip if it's a user-defined function name
    if (allFunctionNames.has(match)) {
      continue; // Don't add to unknown variables
    }

    // Skip if this identifier is a full property reference (e.g., "paint.coverage_per_liters")
    // Property references are tracked separately and shouldn't be in unknown variables
    if (allPropertyRefs.has(match)) {
      continue;
    }

    // Skip if this identifier is part of a property reference
    // Only skip the property part (after dot), not the base part
    let isPartOfPropertyRef = false;
    for (const propRef of allPropertyRefs) {
      const parts = propRef.split('.');
      if (parts.length === 2 && parts[1] === match) {
        // This is a property part (e.g., "width" from "wallboard.width")
        isPartOfPropertyRef = true;
        break;
      }
    }

    if (isPartOfPropertyRef) {
      continue;
    }

    // Check if it's a known variable
    if (allAvailableVars.includes(match)) {
      variables.push(match);
    } else {
      unknownVariables.push(match);
    }
  }

  return {
    fieldPropertyRefs: fieldPropertyRefsFormatted,
    materialPropertyRefs: materialPropertyRefsFormatted,
    variables: [...new Set(variables)], // Remove duplicates
    computedOutputs: [...new Set(computedOutputs)], // Computed output references (out.variableName)
    mathFunctions: [...new Set(mathFunctions)], // Remove duplicates
    functionCalls: functionCallsFormatted, // Function calls found in formula
    unknownVariables: [...new Set(unknownVariables)], // Remove duplicates
  };
}
