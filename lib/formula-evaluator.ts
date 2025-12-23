import { evaluate, create, all } from 'mathjs';
import { Material, CalculationModule, QuoteModuleInstance } from './types';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
  // Optional: field definitions for validation (needed to identify material fields)
  fields?: Array<{ variableName: string; type: string; materialCategory?: string }>;
}

export type FormulaDebugInfo = {
  fieldPropertyRefs: Array<{ full: string; fieldVar: string; property: string }>;
  materialPropertyRefs: Array<{ full: string; materialVar: string; property: string }>;
  variables: string[];
  mathFunctions: string[];
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
    round: function(...args: any[]) {
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
    ceil: function(x: any) {
      if (arguments.length !== 1) {
        throw new Error('ceil() expects exactly 1 argument');
      }
      if (typeof x !== 'number' || isNaN(x)) {
        throw new Error('ceil() expects a numeric argument');
      }
      return customRoundingFunctions.ceil(x);
    },
    floor: function(x: any) {
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
    .filter(ref => fieldVariableNames.includes(ref.baseVar))
    .map(ref => ({
      fieldVar: ref.baseVar,
      propertyName: ref.propertyName,
      fullMatch: ref.fullMatch,
    }));
}

/**
 * Resolves a material property reference to its numeric value
 * Returns the property value converted to a number, or null if not found
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
  
  const property = material.properties.find((p) => p.name === propertyName);
  if (!property) {
    return null;
  }
  
  // Convert property value to number based on type
  if (property.type === 'number') {
    return typeof property.value === 'number' ? property.value : Number(property.value) || 0;
  } else if (property.type === 'boolean') {
    return property.value === true || property.value === 'true' ? 1 : 0;
  } else if (property.type === 'string') {
    // Attempt numeric conversion for string properties
    const numValue = Number(property.value);
    return !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
  }
  
  return null;
}

/**
 * Resolves a field property reference to its numeric value
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
    
    // STEP 1: Replace field property references FIRST (e.g., wallboard.width)
    // This must happen BEFORE replacing field variables to avoid conflicts
    const fieldVariableNames = Object.keys(context.fieldValues);
    const fieldPropertyRefs = parseFieldPropertyReferences(processedFormula, fieldVariableNames);
    for (const ref of fieldPropertyRefs) {
      try {
        const propertyValue = resolveFieldProperty(ref.fieldVar, ref.propertyName, context);
        // Replace the full property reference with its numeric value
        const regex = new RegExp(`\\b${escapeRegex(ref.fullMatch)}\\b`, 'g');
        processedFormula = processedFormula.replace(regex, propertyValue.toString());
      } catch (error: any) {
        // Re-throw field property errors with clear messages
        throw error;
      }
    }
    
    // STEP 2: Replace field variable values
    // Material fields: When a field value is a string matching a material's variableName,
    // it is automatically resolved to that material's price for formula evaluation.
    // Example: If field 'material' has value 'mat_kvirke_48x98', and that material's price is 1.00,
    // then 'material' in the formula will be replaced with '1.00'.
    for (const [varName, value] of Object.entries(context.fieldValues)) {
      let numValue: number;
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        numValue = value ? 1 : 0;
      } 
      // Handle material selections: if value is a string that matches a material variable name, resolve to price
      else if (typeof value === 'string') {
        const material = context.materials.find((m) => m.variableName === value);
        if (material) {
          // This is a material selection - use the material's price
          numValue = material.price;
        } else {
          // Try to convert to number (for numeric text fields)
          numValue = Number(value);
        }
      } 
      // Handle numeric values
      else {
        numValue = Number(value);
      }
      
      // Only replace if we have a valid number
      if (!isNaN(numValue) && isFinite(numValue)) {
        // Replace variable name with value (using word boundaries to avoid partial matches)
        const regex = new RegExp(`\\b${escapeRegex(varName)}\\b`, 'g');
        processedFormula = processedFormula.replace(regex, numValue.toString());
      }
    }
    
    // STEP 3: Replace material property references (e.g., mat_plank.length)
    // This must happen BEFORE replacing material variables to avoid conflicts
    const materialPropertyRefs = parseMaterialPropertyReferences(processedFormula);
    for (const ref of materialPropertyRefs) {
      const propertyValue = resolveMaterialProperty(ref.materialVar, ref.propertyName, context.materials);
      if (propertyValue !== null) {
        // Replace the full property reference with its numeric value
        const regex = new RegExp(`\\b${escapeRegex(ref.fullMatch)}\\b`, 'g');
        processedFormula = processedFormula.replace(regex, propertyValue.toString());
      } else {
        // Property not found - fall back to material price if material exists
        const material = context.materials.find((m) => m.variableName === ref.materialVar);
        if (material) {
          const regex = new RegExp(`\\b${escapeRegex(ref.fullMatch)}\\b`, 'g');
          processedFormula = processedFormula.replace(regex, material.price.toString());
        }
      }
    }
    
    // STEP 4: Replace material variable values
    // Property references have already been replaced, so we can safely replace all material variables
    // The regex won't match property references since they've been converted to numbers
    for (const material of context.materials) {
      const regex = new RegExp(`\\b${escapeRegex(material.variableName)}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, material.price.toString());
    }
    
    // Check for unreplaced variables (identifiers that aren't math functions)
    // Note: We need to exclude property references that were already processed
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/g;
    const mathFunctions = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'];
    const matches = processedFormula.match(variableRegex);
    const unreplacedVars: string[] = [];
    
    // Track which variables were used in property references (to avoid false positives)
    const fieldVarsInPropertyRefs = new Set(fieldPropertyRefs.map(ref => ref.fieldVar));
    const materialVarsInPropertyRefs = new Set(materialPropertyRefs.map(ref => ref.materialVar));
    
    if (matches) {
      for (const match of matches) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;
        // Skip if it's a math function
        if (mathFunctions.includes(match)) continue;
        // Skip if it's a property reference (already processed)
        if (match.includes('.')) continue;
        // Skip field variables that were used in property references
        if (fieldVarsInPropertyRefs.has(match)) continue;
        // Skip material variables that were used in property references
        if (materialVarsInPropertyRefs.has(match)) continue;
        // This is an unreplaced variable
        unreplacedVars.push(match);
      }
    }
    
    if (unreplacedVars.length > 0) {
      throw new Error(`Missing values for variables: ${unreplacedVars.join(', ')}`);
    }
    
    // Evaluate the formula using our custom math instance
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
 * Validates a formula syntax and checks if variables exist
 */
export function validateFormula(
  formula: string,
  availableVariables: string[],
  materials: Material[],
  fields?: Array<{ variableName: string; type: string; materialCategory?: string }>
): { valid: boolean; error?: string } {
  try {
    // First, check field property references (e.g., wallboard.width)
    const fieldPropertyRefs = parseFieldPropertyReferences(formula, availableVariables);
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
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = formula.match(variableRegex);
    
    if (matches) {
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
      
      for (const match of matches) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;
        
        // Skip if it's a math function or constant
        if (['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'].includes(match)) {
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
    
    // Replace regular variables
    const allVars = [...availableVariables, ...materials.map(m => m.variableName)];
    for (const varName of allVars) {
      // It's safe to always try replacing here:
      // - We already replaced full property refs like "wallboard.width" above.
      // - The regex uses word boundaries, so it won't touch "wallboard" inside "wallboard.width".
      const regex = new RegExp(`\\b${escapeRegex(varName)}\\b`, 'g');
      testFormula = testFormula.replace(regex, '1');
    }
    
    // Use our custom math instance for validation
    mathInstance.evaluate(testFormula);
    
    return { valid: true };
  } catch (error: any) {
    // Provide better error messages for rounding functions
    const errorMessage = error.message || 'Invalid formula syntax';
    return {
      valid: false,
      error: errorMessage
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
  fields?: Array<{ variableName: string; type: string; materialCategory?: string }>
): FormulaDebugInfo {
  const mathFunctionsList = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'];
  
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
  const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const matches = formula.match(variableRegex) || [];
  
  // Track which full property references exist
  const allPropertyRefs = new Set([
    ...fieldPropertyRefs.map(ref => ref.fullMatch),
    ...filteredMaterialPropertyRefs.map(ref => ref.fullMatch)
  ]);
  
  // Collect all available variables
  const allAvailableVars = [
    ...availableVariables,
    ...materials.map(m => m.variableName),
    ...mathFunctionsList
  ];
  
  const variables: string[] = [];
  const mathFunctions: string[] = [];
  const unknownVariables: string[] = [];
  
  for (const match of matches) {
    // Skip if it's a number
    if (!isNaN(Number(match))) continue;
    
    // Check if it's a math function
    if (mathFunctionsList.includes(match)) {
      mathFunctions.push(match);
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
    mathFunctions: [...new Set(mathFunctions)], // Remove duplicates
    unknownVariables: [...new Set(unknownVariables)], // Remove duplicates
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

