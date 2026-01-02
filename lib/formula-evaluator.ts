import { evaluate, create, all } from 'mathjs';
import { Material, CalculationModule, QuoteModuleInstance, SharedFunction } from './types';
import { UnitCategory, getUnitCategory, normalizeToBase, multiplyUnits, divideUnits } from './units';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  // Optional: field definitions for validation (needed to identify material fields and default values)
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; defaultValue?: string | number | boolean }>;
  functionOutputs?: Record<string, number>; // Pre-computed function outputs (for linked functions)
  functions?: SharedFunction[]; // Available functions
}

export type FormulaDebugInfo = {
  fieldPropertyRefs: Array<{ full: string; fieldVar: string; property: string }>;
  materialPropertyRefs: Array<{ full: string; materialVar: string; property: string }>;
  variables: string[];
  computedOutputs: string[]; // Computed outputs (out.variableName)
  mathFunctions: string[];
  functionCalls: Array<{ name: string; arguments: string[]; fullMatch: string }>;
  unknownVariables: string[];
};

/**
 * Custom rounding functions with proper error handling
 */
const customRoundingFunctions = {
  /**
   * Round to nearest integer
   * round(x) → rounds x to nearest integer
   */
  round: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('round() expects a numeric argument');
    }
    return Math.round(x);
  },

  /**
   * Round to specified decimal places
   * round(x, decimals) → rounds x to 'decimals' decimal places
   */
  roundDecimals: (x: number, decimals: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('round() expects a numeric first argument');
    }
    if (typeof decimals !== 'number' || isNaN(decimals)) {
      throw new Error('round() with 2 arguments expects a numeric decimals value');
    }
    const factor = Math.pow(10, Math.round(decimals));
    return Math.round(x * factor) / factor;
  },

  /**
   * Round up to next integer
   * ceil(x) → rounds x up
   */
  ceil: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('ceil() expects a numeric argument');
    }
    return Math.ceil(x);
  },

  /**
   * Round down to previous integer
   * floor(x) → rounds x down
   */
  floor: (x: number): number => {
    if (typeof x !== 'number' || isNaN(x)) {
      throw new Error('floor() expects a numeric argument');
    }
    return Math.floor(x);
  },
};

/**
 * Creates a mathjs instance with custom rounding functions
 * Handles round() with 1 or 2 arguments and provides better error messages
 */
function createMathInstance() {
  const math = create(all);

  // Override round to handle both 1 and 2 argument cases with better error handling
  math.import({
    round: function (...args: any[]) {
      if (args.length === 0) {
        throw new Error('round() requires at least 1 argument');
      }
      if (args.length > 2) {
        throw new Error('round() accepts at most 2 arguments');
      }
      // Validate first argument
      const x = args[0];
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('round() expects a numeric first argument');
      }
      // If only one argument, round to nearest integer
      if (args.length === 1) {
        return customRoundingFunctions.round(x);
      }
      // If two arguments, round to specified decimals
      const decimals = args[1];
      if (typeof decimals !== 'number' || isNaN(decimals)) {
        throw new Error('round() with 2 arguments expects a numeric decimals value');
      }
      return customRoundingFunctions.roundDecimals(x, decimals);
    },
    ceil: function (x: any) {
      if (arguments.length !== 1) {
        throw new Error('ceil() expects exactly 1 argument');
      }
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('ceil() expects a numeric argument');
      }
      return customRoundingFunctions.ceil(x);
    },
    floor: function (x: any) {
      if (arguments.length !== 1) {
        throw new Error('floor() expects exactly 1 argument');
      }
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('floor() expects a numeric argument');
      }
      return customRoundingFunctions.floor(x);
    },
  }, { override: true });

  return math;
}

const mathInstance = createMathInstance();

type IdentifierToken = {
  text: string;
  base: string;
  property?: string;
  hasDot: boolean;
};

const IDENTIFIER_REGEX = /[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?/g;
const MATH_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor']);

/**
 * Interface for parsed function calls
 */
export interface FunctionCall {
  functionName: string;
  arguments: string[]; // Variable names passed as arguments
  fullMatch: string; // Full match string for replacement
  startIndex: number;
  endIndex: number;
}

/**
 * Parses function calls in a formula (e.g., m2(width, height))
 * Returns an array of FunctionCall objects
 */
export function parseFunctionCalls(formula: string): FunctionCall[] {
  const functionCallRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
  const calls: FunctionCall[] = [];
  let match;

  while ((match = functionCallRegex.exec(formula)) !== null) {
    const functionName = match[1];
    
    // Skip if it's a math function
    if (MATH_FUNCTIONS.has(functionName)) {
      continue;
    }

    const argsString = match[2].trim();
    const args = argsString
      ? argsString.split(',').map(arg => arg.trim()).filter(arg => arg.length > 0)
      : [];

    calls.push({
      functionName,
      arguments: args,
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return calls;
}

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
 * Tokenizes identifiers in a string and applies a replacement handler.
 * Returns the rebuilt string with replacements applied.
 * 
 * @param input - The input string to process
 * @param handler - Function to determine replacement for each identifier
 * @param excludeRanges - Optional array of [startIndex, endIndex] ranges to exclude from replacement
 *                        (e.g., function call ranges to prevent replacing function names or arguments)
 */
function replaceIdentifiers(
  input: string,
  handler: (token: IdentifierToken) => string | null | undefined,
  excludeRanges?: Array<[number, number]>
): string {
  let result = '';
  let lastIndex = 0;
  IDENTIFIER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  // Helper to check if a position is within an excluded range
  const isExcluded = (index: number, length: number): boolean => {
    if (!excludeRanges) return false;
    const endIndex = index + length;
    return excludeRanges.some(([start, end]) => {
      // Check if identifier overlaps with excluded range
      return (index >= start && index < end) || (endIndex > start && endIndex <= end) || (index < start && endIndex > end);
    });
  };

  while ((match = IDENTIFIER_REGEX.exec(input)) !== null) {
    const tokenText = match[0];
    const matchIndex = match.index;
    
    // Skip if this identifier is within an excluded range (e.g., inside function call)
    if (isExcluded(matchIndex, tokenText.length)) {
      result += input.slice(lastIndex, matchIndex + tokenText.length);
      lastIndex = matchIndex + tokenText.length;
      continue;
    }
    
    const hasDot = tokenText.includes('.');
    const [base, property] = tokenText.split('.');
    const token: IdentifierToken = {
      text: tokenText,
      base,
      property,
      hasDot,
    };

    result += input.slice(lastIndex, matchIndex);

    const replacement = handler(token);
    result += replacement !== null && replacement !== undefined ? replacement : tokenText;

    lastIndex = IDENTIFIER_REGEX.lastIndex;
  }

  result += input.slice(lastIndex);
  return result;
}

/**
 * Parses all property references in dot notation (e.g., mat_plank.length, wallboard.width)
 * Returns an array of { baseVar, propertyName, fullMatch, isFieldProperty } objects
 */
function parsePropertyReferences(formula: string): Array<{ baseVar: string; propertyName: string; fullMatch: string; isFieldProperty?: boolean }> {
  const propertyRefRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches: Array<{ baseVar: string; propertyName: string; fullMatch: string; isFieldProperty?: boolean }> = [];
  let match;

  while ((match = propertyRefRegex.exec(formula)) !== null) {
    matches.push({
      baseVar: match[1],
      propertyName: match[2],
      fullMatch: match[0],
    });
  }

  return matches;
}

/**
 * Parses material property references in dot notation (e.g., mat_plank.length)
 * Returns an array of { materialVar, propertyName, fullMatch } objects
 */
function parseMaterialPropertyReferences(formula: string): Array<{ materialVar: string; propertyName: string; fullMatch: string }> {
  const propertyRefs = parsePropertyReferences(formula);
  return propertyRefs
    .filter(ref => !ref.isFieldProperty)
    .filter(ref => !ref.fullMatch.startsWith('out.')) // Exclude computed output references (out.*)
    .map(ref => ({
      materialVar: ref.baseVar,
      propertyName: ref.propertyName,
      fullMatch: ref.fullMatch,
    }));
}

/**
 * Parses field property references in dot notation (e.g., wallboard.width)
 * Returns an array of { fieldVar, propertyName, fullMatch } objects
 */
function parseFieldPropertyReferences(
  formula: string,
  fieldVariableNames: string[]
): Array<{ fieldVar: string; propertyName: string; fullMatch: string }> {
  const propertyRefs = parsePropertyReferences(formula);
  return propertyRefs
    .filter(ref => !ref.fullMatch.startsWith('out.')) // Exclude computed output references (out.*)
    .filter(ref => fieldVariableNames.includes(ref.baseVar))
    .map(ref => ({
      fieldVar: ref.baseVar,
      propertyName: ref.propertyName,
      fullMatch: ref.fullMatch,
    }));
}

/**
 * Resolves a material property reference to its numeric value (base-normalized)
 * Returns the property value converted to a number, or null if not found
 * Always uses storedValue (canonical) if available, falls back to value with migration
 */
function resolveMaterialProperty(
  materialVar: string,
  propertyName: string,
  materials: Material[]
): number | null {
  const material = materials.find((m) => m.variableName === materialVar);
  if (!material || !material.properties) {
    return null;
  }

  return getMaterialPropertyValueFromMaterial(material, propertyName);
}

/**
 * Gets the unit category for a material property
 */
function getMaterialPropertyUnitCategory(
  materialVar: string,
  propertyName: string,
  materials: Material[]
): UnitCategory | undefined {
  const material = materials.find((m) => m.variableName === materialVar);
  if (!material || !material.properties) {
    return undefined;
  }

  const property = material.properties.find((p) => p.name === propertyName);
  if (!property) {
    return undefined;
  }

  // Use unitCategory if available, otherwise infer from unitSymbol
  if (property.unitCategory) {
    return property.unitCategory;
  }
  if (property.unitSymbol) {
    return getUnitCategory(property.unitSymbol);
  }

  return undefined;
}

function getMaterialPropertyValueFromMaterial(
  material: Material,
  propertyName: string
): number | null {
  if (!material.properties) {
    return null;
  }

  const property = material.properties.find((p) => p.name === propertyName);
  if (!property) {
    return null;
  }

  if (property.type === 'number' || property.type === 'price') {
    if (property.storedValue !== undefined) {
      return property.storedValue;
    }
    const rawValue = typeof property.value === 'number' ? property.value : Number(property.value) || 0;
    return property.unitSymbol ? normalizeToBase(rawValue, property.unitSymbol) : rawValue;
  }

  if (property.type === 'boolean') {
    return property.value === true || property.value === 'true' ? 1 : 0;
  }

  if (property.type === 'string') {
    const rawValue = Number(property.value);
    return !isNaN(rawValue) && isFinite(rawValue) ? rawValue : 0;
  }

  return null;
}

/**
 * Resolves a field property reference to its numeric value (base-normalized)
 * Returns the property value converted to a number
 * Throws error if material not selected or property doesn't exist
 */
function resolveFieldProperty(
  fieldVar: string,
  propertyName: string,
  context: EvaluationContext
): number {
  const fieldValue = context.fieldValues[fieldVar];

  // Check if field value is a material selection (string matching material variableName)
  if (typeof fieldValue !== 'string') {
    throw new Error(`Field "${fieldVar}" is not a material field or no material is selected`);
  }

  const material = context.materials.find((m) => m.variableName === fieldValue);
  if (!material) {
    throw new Error(`No material selected for field "${fieldVar}"`);
  }

  const propertyValue = resolveMaterialProperty(fieldValue, propertyName, context.materials);
  if (propertyValue === null) {
    throw new Error(`Property "${propertyName}" not found on selected material "${material.name}" for field "${fieldVar}"`);
  }

  return propertyValue;
}

/**
 * Gets the unit category for a field property reference
 */
function getFieldPropertyUnitCategory(
  fieldVar: string,
  propertyName: string,
  context: EvaluationContext
): UnitCategory | undefined {
  const fieldValue = context.fieldValues[fieldVar];

  if (typeof fieldValue !== 'string') {
    return undefined;
  }

  return getMaterialPropertyUnitCategory(fieldValue, propertyName, context.materials);
}

/**
 * Gets the unit category for a field variable
 */
function getFieldUnitCategory(
  fieldVar: string,
  fields?: Array<{ variableName: string; type: string; unitCategory?: UnitCategory; unitSymbol?: string }>
): UnitCategory | undefined {
  const field = fields?.find(f => f.variableName === fieldVar);
  if (!field) {
    return undefined;
  }

  // Use unitCategory if available, otherwise infer from unitSymbol
  if (field.unitCategory) {
    return field.unitCategory;
  }
  if (field.unitSymbol) {
    return getUnitCategory(field.unitSymbol);
  }

  return undefined;
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
    // Example: If field 'material' has value 'mat_kvirke_48x98', and that material's price is 1.00,
    // then 'material' in the formula will be replaced with '1.00'.
    const fieldValueMap = new Map<string, number>();
    for (const [varName, value] of Object.entries(context.fieldValues)) {
      let numValue: number;

      if (typeof value === 'boolean') {
        numValue = value ? 1 : 0;
      } else if (typeof value === 'string') {
        const material = context.materials.find((m) => m.variableName === value);
        if (material) {
          numValue = material.price;
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
    const sortedCalls = [...functionCalls].sort((a, b) => b.startIndex - a.startIndex);
    
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

/**
 * Phase 1 unit compatibility validation
 * Checks for obvious unit errors: incompatible additions, invalid divisions
 */
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
  fields?: Array<{ variableName: string; type: string; materialCategory?: string; dropdownMode?: 'numeric' | 'string'; unitCategory?: UnitCategory; unitSymbol?: string }>,
  functions?: SharedFunction[]
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

      // Check if field is a material field
      if (field.type !== 'material') {
        return {
          valid: false,
          error: `Field "${ref.fieldVar}" is not a material field, cannot access properties`
        };
      }

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
            // But only skip the property part, not the base part (base parts can be used standalone)
            if (parts[1] === match) {
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
