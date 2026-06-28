export type IdentifierToken = {
  text: string;
  base: string;
  property?: string;
  hasDot: boolean;
};

const IDENTIFIER_REGEX = /[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?/g;
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
  const functionNameRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let match;

  while ((match = functionNameRegex.exec(formula)) !== null) {
    const functionName = match[1];
    
    // Skip if it's a math function
    if (MATH_FUNCTIONS.has(functionName)) {
      continue;
    }

    const startIndex = match.index;
    const openParenIndex = match.index + match[0].length - 1; // Position of '('

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

export function getOutermostFunctionCalls(calls: FunctionCall[]): FunctionCall[] {
  return calls.filter((call) => {
    return !calls.some((candidateParent) => {
      if (candidateParent === call) return false;
      return (
        candidateParent.startIndex < call.startIndex &&
        candidateParent.endIndex >= call.endIndex
      );
    });
  });
}

export function replaceIdentifiers(
  input: string,
  handler: (token: IdentifierToken) => string | null | undefined,
  excludeRanges?: Array<[number, number]>
): string {
  let result = '';
  let lastIndex = 0;
  IDENTIFIER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  const isExcluded = (index: number, length: number): boolean => {
    if (!excludeRanges) return false;
    const endIndex = index + length;
    return excludeRanges.some(([start, end]) => {
      return (index >= start && index < end) || (endIndex > start && endIndex <= end) || (index < start && endIndex > end);
    });
  };

  while ((match = IDENTIFIER_REGEX.exec(input)) !== null) {
    const tokenText = match[0];
    const matchIndex = match.index;

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

export function parsePropertyReferences(formula: string): Array<{ baseVar: string; propertyName: string; fullMatch: string; isFieldProperty?: boolean }> {
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

export function parseMaterialPropertyReferences(formula: string): Array<{ materialVar: string; propertyName: string; fullMatch: string }> {
  const propertyRefs = parsePropertyReferences(formula);
  return propertyRefs
    .filter(ref => !ref.isFieldProperty)
    .filter(ref => !ref.fullMatch.startsWith('out.'))
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
    .filter(ref => !ref.fullMatch.startsWith('out.'))
    .filter(ref => fieldVariableNames.includes(ref.baseVar))
    .map(ref => ({
      fieldVar: ref.baseVar,
      propertyName: ref.propertyName,
      fullMatch: ref.fullMatch,
    }));
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
