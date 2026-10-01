import { NAME_START } from './identifiers';

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
    if (new RegExp(`^[${NAME_START}]`).test(part)) {
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

/**
 * A step's evaluator error in plain words, for the person writing the formula. The evaluator's
 * own messages ("Formula evaluation failed: Unexpected end of expression (char 8)") stay as
 * they are for the validator and the old module calculator; this is only for what a step shows.
 */
export function friendlyEvaluationMessage(raw: string): string {
  const position = raw.match(/\(char (\d+)\)\s*$/);
  const text = friendlyBody(raw);
  return position && !/^In .+\(\):/.test(text) ? `${text} (character ${position[1]})` : text;
}

function friendlyBody(raw: string): string {
  let message = raw.replace(/^Formula evaluation failed:\s*/, '').trim();
  const position = message.match(/\s*\(char (\d+)\)\s*$/);
  if (position) message = message.slice(0, position.index).trim();

  const nested = message.match(/^Error evaluating (?:nested )?function '([^']+)'[^:]*:\s*(.*)$/s);
  if (nested) return `In ${nested[1]}(): ${friendlyEvaluationMessage(nested[2])}`;

  if (/^Unexpected end of expression/.test(message)) {
    return `The formula stops too early. A value is missing after the last operator.`;
  }
  if (/^Value expected/.test(message)) return `A value is missing here.`;
  const operator = message.match(/^Unexpected operator (.+)$/);
  if (operator?.[1] === ')') return `A closing bracket has no matching opening one.`;
  if (operator) return `The operator ${operator[1]} has no value next to it. Check for a doubled or leading symbol.`;
  const part = message.match(/^Unexpected part "([^"]+)"/);
  if (part) {
    return /^\d/.test(part[1])
      ? `Two values sit next to each other. Put an operator (+, -, *, /) between them.`
      : `Didn't expect "${part[1]}" here. Is an operator (+, -, *, /) missing before it?`;
  }
  if (/^Parenthesis \) expected/.test(message)) return `A bracket is never closed. Add the missing ).`;
  if (/^Parenthesis/.test(message) || /unexpected/i.test(message) && /parenthesis/i.test(message)) {
    return `A closing bracket has no matching opening one.`;
  }
  const symbol = message.match(/^Undefined symbol (.+)$/);
  if (symbol) return `"${symbol[1]}" isn't an input, a step or a catalog item. Check the spelling.`;
  const fn = message.match(/^Undefined function (.+)$/) ?? message.match(/^Function '([^']+)' not found$/);
  if (fn) return `There's no function called "${fn[1]}".`;
  const missing = message.match(/^Missing values for variables: (.+)$/);
  if (missing) return `No value yet for ${missing[1]}.`;
  if (/infinity/.test(message)) return 'The result is infinite. Something is divided by zero.';
  if (/NaN|non-numeric/.test(message)) return "The formula doesn't give a number.";

  const sentence = /^\w+\(\)/.test(message) ? message : `${message.charAt(0).toUpperCase()}${message.slice(1)}`;
  return message.endsWith('.') ? sentence : `${sentence}.`;
}
