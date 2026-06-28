import { SharedFunction } from '../types';
import { EvaluationContext } from './types';
import { mathInstance } from './math-runtime';
import { FunctionCall, MATH_FUNCTIONS, getOutermostFunctionCalls, parseFieldPropertyReferences, parseFunctionCalls, parseMaterialPropertyReferences, replaceIdentifiers } from './parser';
import { resolveFieldProperty, resolveMaterialProperty } from './resolver';

/**
 * Evaluates a function call by:
 * 1. Finding the function definition
 * 2. Mapping arguments to actual values from context
 * 3. Evaluating the function formula with mapped values
 * 4. Returning the result
 */
function evaluateFunctionCall(
  call: FunctionCall,
  context: EvaluationContext,
  functions: SharedFunction[]
): number {
  // Find function definition
  const funcDef = functions.find(f => f.name === call.functionName);
  if (!funcDef) {
    throw new Error(`Function '${call.functionName}' not found`);
  }

  // Check parameter count
  if (call.arguments.length !== funcDef.parameters.length) {
    throw new Error(
      `Function '${call.functionName}' expects ${funcDef.parameters.length} argument(s), but got ${call.arguments.length}`
    );
  }

  // Create a context for evaluating the function formula
  // Map function parameters to the provided argument values
  const functionContext: EvaluationContext = {
    fieldValues: {},
    materials: context.materials,
    fields: context.fields,
    functions: functions, // Allow nested function calls
  };

  // Map arguments to parameter names
  for (let i = 0; i < funcDef.parameters.length; i++) {
    const paramName = funcDef.parameters[i].name;
    const argVarName = call.arguments[i];

    // Resolve argument value from context
    let argValue: string | number | boolean;
    
    // Check if argument is itself a function call (nested functions)
    // Example: m2(func1(x), height) - func1(x) needs to be evaluated first
    const nestedFunctionCalls = parseFunctionCalls(argVarName);
    if (nestedFunctionCalls.length > 0) {
      // Evaluate the nested function call
      // Create a temporary context for evaluating the nested call
      const nestedContext: EvaluationContext = {
        fieldValues: context.fieldValues,
        materials: context.materials,
        fields: context.fields,
        functionOutputs: context.functionOutputs,
        functions: functions,
      };
      try {
        argValue = evaluateFormula(argVarName, nestedContext);
      } catch (error: any) {
        throw new Error(`Error evaluating nested function call '${argVarName}' for function '${call.functionName}' parameter '${paramName}': ${error.message}`);
      }
    }
    // Check if it's a direct field value
    else if (argVarName in context.fieldValues) {
      argValue = context.fieldValues[argVarName];
    } 
    // Check field default values as fallback
    else if (context.fields) {
      const field = context.fields.find(f => f.variableName === argVarName);
      if (field && field.defaultValue !== undefined) {
        argValue = field.defaultValue;
      } else {
        // Check if it's a function output (for linked functions)
        if (context.functionOutputs && argVarName in context.functionOutputs) {
          argValue = context.functionOutputs[argVarName];
        }
        // Check if it's a material variable
        else {
          const material = context.materials.find(m => m.variableName === argVarName);
          if (material) {
            argValue = material.price;
          } else {
            // Try to parse as number
            const numValue = Number(argVarName);
            if (!isNaN(numValue) && isFinite(numValue)) {
              argValue = numValue;
            } else {
              throw new Error(`Variable '${argVarName}' not found for function '${call.functionName}' parameter '${paramName}'`);
            }
          }
        }
      }
    }
    // Check if it's a function output (for linked functions)
    else if (context.functionOutputs && argVarName in context.functionOutputs) {
      argValue = context.functionOutputs[argVarName];
    }
    // Check if it's a material variable
    else {
      const material = context.materials.find(m => m.variableName === argVarName);
      if (material) {
        argValue = material.price;
      } else {
        // Try to parse as number
        const numValue = Number(argVarName);
        if (!isNaN(numValue) && isFinite(numValue)) {
          argValue = numValue;
        } else {
          throw new Error(`Variable '${argVarName}' not found for function '${call.functionName}' parameter '${paramName}'`);
        }
      }
    }

    // Map parameter name to argument value in function context
    functionContext.fieldValues[paramName] = argValue;
  }

  // Evaluate the function formula with the mapped context
  return evaluateFormula(funcDef.formula, functionContext);
}

/**
 * Evaluates a formula with given context
 * Replaces variable names with actual values
 * 
 * Rounding Function Examples:
 * - round(3.2) → 3
 * - round(3.5) → 4
 * - round(3.14159, 2) → 3.14
 * - round(3.14159, 0) → 3
 * - ceil(3.1) → 4
 * - ceil(3.0) → 3
 * - floor(3.9) → 3
 * - floor(3.1) → 3
 * 
 * Formula Examples:
 * - length * width * round(price, 2)
 * - ceil(total_cost / 100) * 100
 * - floor(area / 10) * 10
 */
export function evaluateFormula(
  formula: string,
  context: EvaluationContext
): number {
  try {
    let processedFormula = formula;
    const functions = context.functions || [];

    // STEP 0: Parse function calls (but don't evaluate yet - we need variable values first)
    // We'll re-parse after each replacement pass to keep exclusion ranges accurate
    let functionCalls = parseFunctionCalls(processedFormula);
    
    // Helper function to update exclusion ranges after string modifications
    const updateExclusionRanges = (): Array<[number, number]> => {
      return functionCalls.map(call => {
        // Exclude the entire function call: from startIndex to endIndex (includes arguments)
        return [call.startIndex, call.endIndex];
      });
    };
    
    // Also create a set of function names for quick lookup
    let functionNames = new Set(functionCalls.map(call => call.functionName));

    // STEP 1: Replace field property references FIRST (e.g., wallboard.width)
    // This must happen BEFORE replacing field variables to avoid conflicts
    const fieldVariableNames = Object.keys(context.fieldValues);
    const fieldPropertyRefs = parseFieldPropertyReferences(processedFormula, fieldVariableNames);
    const fieldPropertyValueMap = new Map<string, string>();
    for (const ref of fieldPropertyRefs) {
      const propertyValue = resolveFieldProperty(ref.fieldVar, ref.propertyName, context);
      fieldPropertyValueMap.set(ref.fullMatch, propertyValue.toString());
    }
    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (token.hasDot && fieldPropertyValueMap.has(token.text)) {
        return fieldPropertyValueMap.get(token.text);
      }
      return null;
    }, updateExclusionRanges());
    
    // Re-parse function calls after STEP 1 to update exclusion ranges
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    // STEP 2: Replace field variable values
    // Material fields: When a field value is a string matching a material's variableName,
    // it is automatically resolved to that material's price for formula evaluation.
    // Labor fields: When a field value is a string matching a labor item's variableName,
    // it is automatically resolved to that labor item's cost for formula evaluation.
    // Example: If field 'material' has value 'mat_kvirke_48x98', and that material's price is 1.00,
    // then 'material' in the formula will be replaced with '1.00'.
    // Example: If field 'labor' has value 'drywall_labor', and that labor's cost is 45.00,
    // then 'labor' in the formula will be replaced with '45.00'.
    const fieldValueMap = new Map<string, number>();
    for (const [varName, value] of Object.entries(context.fieldValues)) {
      let numValue: number;

      if (typeof value === 'boolean') {
        numValue = value ? 1 : 0;
      } else if (typeof value === 'string') {
        // Check if it's a material
        const material = context.materials.find((m) => m.variableName === value);
        if (material) {
          numValue = material.price;
        } else if (context.labor && context.labor.length > 0) {
          // Check if it's a labor item
          const laborItem = context.labor.find((l) => l.variableName === value);
          if (laborItem) {
            numValue = laborItem.cost;
          } else {
            numValue = Number(value);
          }
        } else {
          numValue = Number(value);
        }
      } else {
        numValue = Number(value);
      }

      if (!isNaN(numValue) && isFinite(numValue)) {
        fieldValueMap.set(varName, numValue);
      }
    }

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      // Skip function names (they should not be replaced)
      if (functionNames.has(token.text)) return null;
      
      // Handle computed outputs (out.variableName) as regular field values
      // They are NOT property references, they're stored directly in fieldValues
      if (token.hasDot && token.text.startsWith('out.')) {
        if (fieldValueMap.has(token.text)) {
          return fieldValueMap.get(token.text)?.toString();
        }
        return null;
      }
      if (token.hasDot) return null; // Don't touch property references here
      if (MATH_FUNCTIONS.has(token.text)) return null;
      if (fieldValueMap.has(token.text)) {
        return fieldValueMap.get(token.text)?.toString();
      }
      return null;
    }, updateExclusionRanges());
    
    // Re-parse function calls after STEP 2 to update exclusion ranges
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    // STEP 3: Replace material property references (e.g., mat_plank.length)
    // This must happen BEFORE replacing material variables to avoid conflicts
    // Use processedFormula (not original formula) since the string may have been modified
    const materialPropertyRefs = parseMaterialPropertyReferences(processedFormula);
    const fieldPropertyFullMatches = new Set(fieldPropertyRefs.map(ref => ref.fullMatch));
    const materialPropertyValueMap = new Map<string, string>();
    for (const ref of materialPropertyRefs) {
      // Skip if already handled as a field property ref
      if (fieldPropertyFullMatches.has(ref.fullMatch)) continue;

      const propertyValue = resolveMaterialProperty(ref.materialVar, ref.propertyName, context.materials);
      if (propertyValue !== null) {
        materialPropertyValueMap.set(ref.fullMatch, propertyValue.toString());
      } else {
        const material = context.materials.find((m) => m.variableName === ref.materialVar);
        if (material) {
          materialPropertyValueMap.set(ref.fullMatch, material.price.toString());
        }
      }
    }

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      if (token.hasDot && materialPropertyValueMap.has(token.text)) {
        return materialPropertyValueMap.get(token.text);
      }
      return null;
    }, updateExclusionRanges());
    
    // Re-parse function calls after STEP 3 to update exclusion ranges
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    // STEP 4: Replace material variable values
    // Property references have already been replaced, so we can safely replace all material variables
    // The regex won't match property references since they've been converted to numbers
    const materialValueMap = new Map<string, string>();
    for (const material of context.materials) {
      materialValueMap.set(material.variableName, material.price.toString());
    }

    processedFormula = replaceIdentifiers(processedFormula, (token) => {
      // Skip function names (they should not be replaced)
      if (functionNames.has(token.text)) return null;
      
      if (token.hasDot) return null;
      if (MATH_FUNCTIONS.has(token.text)) return null;
      if (materialValueMap.has(token.text)) {
        return materialValueMap.get(token.text);
      }
      return null;
    }, updateExclusionRanges());
    
    // Re-parse function calls after STEP 4 to update exclusion ranges
    functionCalls = parseFunctionCalls(processedFormula);
    functionNames = new Set(functionCalls.map(call => call.functionName));

    // Check for unreplaced variables (identifiers that aren't math functions)
    // Note: We need to exclude property references and function calls that were already processed
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
    const matches = processedFormula.match(variableRegex);
    const unreplacedVars: string[] = [];

    // Track which variables were used in property references (to avoid false positives)
    const fieldVarsInPropertyRefs = new Set(fieldPropertyRefs.map(ref => ref.fieldVar));
    const materialVarsInPropertyRefs = new Set(materialPropertyRefs.map(ref => ref.materialVar));
    
    // Collect all function call argument variable names to exclude from unreplaced variable check
    // Function arguments will be resolved by evaluateFunctionCall in STEP 5
    const functionCallArgs = new Set<string>();
    for (const call of functionCalls) {
      for (const arg of call.arguments) {
        // Only include simple variable names (not numbers, not nested function calls)
        // Check if it's a valid identifier and not a number
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg.trim()) && isNaN(Number(arg.trim()))) {
          functionCallArgs.add(arg.trim());
        }
      }
    }
    
    // functionNames is already defined above, no need to redefine it

    if (matches) {
      for (const match of matches) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;
        // Skip if it's a math function
        if (MATH_FUNCTIONS.has(match)) continue;
        // Skip if it's a user-defined function name (will be evaluated in STEP 5)
        if (functionNames.has(match)) continue;
        // Skip if it's a property reference (already processed)
        if (match.includes('.')) continue;
        // Skip field variables that were used in property references
        if (fieldVarsInPropertyRefs.has(match)) continue;
        // Skip material variables that were used in property references
        if (materialVarsInPropertyRefs.has(match)) continue;
        // Skip function call arguments (will be resolved by evaluateFunctionCall)
        if (functionCallArgs.has(match)) continue;
        // This is an unreplaced variable
        unreplacedVars.push(match);
      }
    }

    if (unreplacedVars.length > 0) {
      throw new Error(`Missing values for variables: ${unreplacedVars.join(', ')}`);
    }

    // STEP 5: Evaluate function calls (now we have all variable values)
    // Process function calls from innermost to outermost (right to left)
    // Sort by start index descending to process from right to left
    const sortedCalls = getOutermostFunctionCalls(functionCalls).sort((a, b) => b.startIndex - a.startIndex);
    
    for (const call of sortedCalls) {
      try {
        const result = evaluateFunctionCall(call, context, functions);
        // Replace the function call with its result
        processedFormula = 
          processedFormula.slice(0, call.startIndex) +
          result.toString() +
          processedFormula.slice(call.endIndex);
      } catch (error: any) {
        throw new Error(`Error evaluating function '${call.functionName}': ${error.message}`);
      }
    }

    // STEP 6: Evaluate the formula using our custom math instance
    let result: any;
    try {
      result = mathInstance.evaluate(processedFormula);
    } catch (evalError: any) {
      // If mathjs throws an error, provide more context
      throw new Error(`Formula evaluation failed: ${evalError.message || 'Invalid expression'}`);
    }

    // Check if result is a valid number
    if (typeof result !== 'number') {
      throw new Error(`Formula returned non-numeric result: ${typeof result}`);
    }

    if (isNaN(result)) {
      throw new Error('Formula evaluated to NaN (Not a Number)');
    }

    if (!isFinite(result)) {
      throw new Error(`Formula evaluated to ${result > 0 ? 'positive' : 'negative'} infinity`);
    }

    return result;
  } catch (error: any) {
    // Re-throw with better error message
    if (error.message && (
      error.message.includes('round()') ||
      error.message.includes('ceil()') ||
      error.message.includes('floor()') ||
      error.message.includes('Missing values for variables') ||
      error.message.includes('Formula evaluation failed') ||
      error.message.includes('Formula returned non-numeric') ||
      error.message.includes('Formula evaluated to')
    )) {
      // These are already well-formatted errors, just re-throw
      throw error;
    }
    console.error('Formula evaluation error:', {
      formula,
      error: error.message || error,
      stack: error.stack
    });
    throw new Error(`Formula evaluation failed: ${error.message || 'Invalid formula syntax'}`);
  }
}
