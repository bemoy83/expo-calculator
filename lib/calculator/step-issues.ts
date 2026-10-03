import { NAME } from '../formula/identifiers';
import type { FormulaIssue, FormulaIssueLevel } from '../formula/issue-levels';
import type { CallProblem } from './call-context';
import { isStepError } from './format';
import type { StepResult } from './types';

/**
 * What a calculator step's formula has to say about itself, in the same levels the function
 * editor uses (see issue-levels): a mistake in the formula is broken, a name that isn't an input
 * or step yet is unresolved (with "Create input" as its fix), and a call argument of the wrong
 * kind or unit is a heads-up. A step that's just not filled in (no formula yet) or waiting for
 * input values isn't an issue here: those are "incomplete", worded by the step row itself.
 */
export function classifyStepIssues({
  result,
  unknownNames,
  callProblems,
}: {
  result: StepResult | undefined;
  /** Names the formula uses that nothing matches, once the error has settled */
  unknownNames: string[];
  callProblems: CallProblem[];
}): FormulaIssue[] {
  const issues: FormulaIssue[] = [];
  const brokenCall = callProblems.some((problem) => problem.kind === 'arguments');

  // A call with the wrong number of arguments says it better than the evaluator's own error.
  if (result?.status === 'error' && !result.incomplete && result.message && unknownNames.length === 0 && !brokenCall) {
    issues.push({ level: 'broken', message: result.message });
  }

  unknownNames.forEach((name) => issues.push({ level: 'unresolved', name, message: `${name} isn’t an input or step yet.` }));

  callProblems.forEach((problem) =>
    issues.push({ level: problem.kind === 'arguments' ? 'broken' : 'heads-up', message: problem.message })
  );

  return issues;
}

/** Names in "Unknown name" errors that could become inputs. */
export function unknownNameIn(message: string | undefined): string | undefined {
  return message?.match(new RegExp(`^Unknown name "(${NAME})"`))?.[1];
}

/**
 * How serious a step's own error is, for places that only have its result: a name that is not an
 * input or step yet is unresolved, any other error is broken, and a step that is fine, or just
 * not filled in yet, has none.
 */
export function stepErrorLevel(result: StepResult | undefined): Extract<FormulaIssueLevel, 'broken' | 'unresolved'> | null {
  if (!isStepError(result)) return null;
  return unknownNameIn(result?.message) ? 'unresolved' : 'broken';
}
