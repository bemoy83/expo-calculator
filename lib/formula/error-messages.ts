function getErrorContext(errorMessage: string, formula: string): string {
  const charMatch = errorMessage.match(/\(char (\d+)\)/);
  const charPos = charMatch ? parseInt(charMatch[1], 10) : null;

  if (charPos === null || charPos >= formula.length) {
    return '';
  }

  const start = Math.max(0, charPos - 10);
  const end = Math.min(formula.length, charPos + 10);
  const before = formula.substring(start, charPos);
  const at = formula[charPos];
  const after = formula.substring(charPos + 1, end);
  return ` near "${before}${at}${after}"`;
}

export function translateParserError(errorMessage: string, formula: string): string {
  const context = getErrorContext(errorMessage, formula);

  if (errorMessage.includes('Unexpected part')) {
    const partMatch = errorMessage.match(/Unexpected part "([^"]+)"/);
    const part = partMatch ? partMatch[1] : 'character';

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
    return errorMessage;
  }

  return `Formula syntax error${context}: ${errorMessage}. Check that your formula uses valid operators (+, -, *, /) and proper parentheses.`;
}
