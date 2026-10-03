import type { FormulaErrorKind } from '../formula/validator';

import type { FormulaIssue } from '../formula/issue-levels';

export type { FormulaIssue, FormulaIssueLevel } from '../formula/issue-levels';

export interface FormulaIssueInput {
  /** A settled check; one still waiting for the formula to rest isn't an issue yet. */
  validation: { valid: boolean; error?: string; errorKind?: FormulaErrorKind; pending?: boolean };
  /** Names the formula uses that aren't parameters */
  unknownNames: string[];
  /** The formula's own syntax problem in plain words, if it has one (see findSyntaxProblem) */
  syntaxProblem?: string | null;
  /** A likely misspelt material property, already worded */
  propertyHint?: string;
  /** Parameters the formula never reads */
  unusedParameters: string[];
}

const list = (names: string[]) => (names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`);

export function classifyFormulaIssues({
  validation,
  unknownNames,
  syntaxProblem,
  propertyHint,
  unusedParameters,
}: FormulaIssueInput): FormulaIssue[] {
  const issues: FormulaIssue[] = [];

  if (!validation.valid && !validation.pending && validation.error) {
    // An undefined variable is each unknown name's own line, below, so it isn't said twice.
    const coveredByNames = unknownNames.length > 0 && validation.error.startsWith('Undefined variable');
    if (!coveredByNames) {
      issues.push({ level: validation.errorKind === 'unresolved' ? 'unresolved' : 'broken', message: validation.error });
    }
  }

  // The validator reports a missing name before it gets to the syntax, so a formula with both would
  // only say "unresolved". Broken wins, so it's added here when the validator didn't already say it.
  const validatorSaidBroken = issues.some((issue) => issue.level === 'broken');
  if (syntaxProblem && !validation.pending && !validatorSaidBroken) {
    issues.unshift({ level: 'broken', message: syntaxProblem });
  }

  unknownNames.forEach((name) => issues.push({ level: 'unresolved', name, message: `${name} isn’t a parameter yet.` }));

  if (propertyHint) issues.push({ level: 'heads-up', message: propertyHint });

  if (unusedParameters.length > 0) {
    issues.push({
      level: 'heads-up',
      message: `${list(unusedParameters)} ${unusedParameters.length === 1 ? 'isn’t' : 'aren’t'} used by the formula.`,
    });
  }

  return issues;
}

export interface FormulaStatus {
  tone: 'ok' | 'attention' | 'error';
  label: string;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The one line for the header: the most serious level wins. */
export function formulaStatus(issues: FormulaIssue[]): FormulaStatus {
  if (issues.some((issue) => issue.level === 'broken')) return { tone: 'error', label: 'Formula has an error' };
  const unresolved = issues.filter((issue) => issue.level === 'unresolved');
  if (unresolved.length > 0) {
    const names = unresolved.filter((issue) => issue.name).length;
    return {
      tone: 'attention',
      label: names === unresolved.length ? `Needs ${plural(names, 'parameter')}` : `${plural(unresolved.length, 'thing')} to resolve`,
    };
  }
  const headsUp = issues.filter((issue) => issue.level === 'heads-up').length;
  return { tone: 'ok', label: headsUp > 0 ? `Formula works · ${plural(headsUp, 'note')}` : 'Formula works' };
}
