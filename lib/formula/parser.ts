import { matchStandalone, NAME } from './identifiers';

export type IdentifierToken = {
  text: string;
  base: string;
  property?: string;
  hasDot: boolean;
};

export const MATH_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'max', 'min', 'log', 'exp', 'pi', 'e', 'round', 'ceil', 'floor']);

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
 * Handles nested function calls and function calls inside operators correctly
 */
export function parseFunctionCalls(formula: string): FunctionCall[] {
  const calls: FunctionCall[] = [];
  for (const match of matchStandalone(formula, `(${NAME})\\s*\\(`, { openEnd: true })) {
    const functionName = match.groups[0];
    
    // Skip if it's a math function
    if (MATH_FUNCTIONS.has(functionName)) {
      continue;
    }

    const startIndex = match.index;
    const openParenIndex = match.index + match.text.length - 1; // Position of '('

    // Find matching closing parenthesis by counting parentheses
    let parenCount = 1;
    let i = openParenIndex + 1;
    let endIndex = -1;

    while (i < formula.length && parenCount > 0) {
      if (formula[i] === '(') {
        parenCount++;
      } else if (formula[i] === ')') {
        parenCount--;
        if (parenCount === 0) {
          endIndex = i;
          break;
        }
      }
      i++;
    }

    if (endIndex === -1) {
      // Unmatched parentheses - skip this match
      continue;
    }

    // Extract arguments string (between parentheses)
    const argsString = formula.slice(openParenIndex + 1, endIndex).trim();

    // Parse arguments, respecting nested parentheses
    const args: string[] = [];
    if (argsString) {
      let currentArg = '';
      let nestedParenCount = 0;

      for (let j = 0; j < argsString.length; j++) {
        const char = argsString[j];

        if (char === '(') {
          nestedParenCount++;
          currentArg += char;
        } else if (char === ')') {
          nestedParenCount--;
          currentArg += char;
        } else if (char === ',' && nestedParenCount === 0) {
          // Found a top-level comma - this separates arguments
          const trimmedArg = currentArg.trim();
          if (trimmedArg.length > 0) {
            args.push(trimmedArg);
          }
          currentArg = '';
        } else {
          currentArg += char;
        }
      }

      // Add the last argument
      const trimmedArg = currentArg.trim();
      if (trimmedArg.length > 0) {
        args.push(trimmedArg);
      }
    }

    calls.push({
      functionName,
      arguments: args,
      fullMatch: formula.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex: endIndex + 1,
    });
  }

  return calls;
}

export function parsePropertyReferences(formula: string): Array<{ baseVar: string; propertyName: string; fullMatch: string; isFieldProperty?: boolean }> {
  return matchStandalone(formula, `(${NAME})\\.(${NAME})`).map((match) => ({
    baseVar: match.groups[0],
    propertyName: match.groups[1],
    fullMatch: match.text,
  }));
}

export function parseMaterialPropertyReferences(formula: string): Array<{ materialVar: string; propertyName: string; fullMatch: string }> {
  const propertyRefs = parsePropertyReferences(formula);
  return propertyRefs
    .filter(ref => !ref.isFieldProperty)
    .map(ref => ({
      materialVar: ref.baseVar,
      propertyName: ref.propertyName,
      fullMatch: ref.fullMatch,
    }));
}

export function parseFieldPropertyReferences(
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
