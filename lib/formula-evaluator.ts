import { evaluate, create, all } from 'mathjs';
import { Material, CalculationModule, QuoteModuleInstance } from './types';

export interface EvaluationContext {
  fieldValues: Record<string, string | number | boolean>;
  materials: Material[];
}

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
    
    // Replace field variable values
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
    
    // Replace material variable values
    for (const material of context.materials) {
      const regex = new RegExp(`\\b${escapeRegex(material.variableName)}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, material.price.toString());
    }
    
    // Check for unreplaced variables (identifiers that aren't math functions)
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const mathFunctions = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'];
    const matches = processedFormula.match(variableRegex);
    const unreplacedVars: string[] = [];
    
    if (matches) {
      for (const match of matches) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;
        // Skip if it's a math function
        if (mathFunctions.includes(match)) continue;
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
  materials: Material[]
): { valid: boolean; error?: string } {
  try {
    // Check for undefined variables
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
      
      for (const match of matches) {
        // Skip if it's a number
        if (!isNaN(Number(match))) continue;
        
        // Skip if it's a math function or constant
        if (['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor'].includes(match)) {
          continue;
        }
        
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
      materials: materials.map(m => ({ ...m, price: 1 }))
    };
    
    // Replace all variables with 1 for syntax check
    let testFormula = formula;
    const allVars = [...availableVariables, ...materials.map(m => m.variableName)];
    for (const varName of allVars) {
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

