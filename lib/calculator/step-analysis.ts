import { calculatorFormulaNames, unknownNameRanges, unknownValueNames, type FormulaNames } from './formula-tokens';
import { findCallProblems, parameterFor, type CallProblem, type ParamSpec } from './call-context';
import { callToExpression } from './step-source';
import { classifyStepIssues, unknownNameIn } from './step-issues';
import type { Calculator, CalculatorLibrary, CalculatorStep, StepResult } from './types';
import { collectDiagnostics } from '../formula/diagnostics';
import { findFormulaErrorRange } from '../formula/error-location';
import type { FormulaDiagnostic, FormulaIssue } from '../formula/issue-levels';
import { analyzeUnits, declaredUnitProblem, type UnitAnalysis } from '../formula/unit-analysis';
import { calculatorUnitResolver, declaredCategory } from '../formula/unit-resolvers';

// What a step's formula has to say about itself: the names nothing matches, the calls made wrongly,
// units that don't add up, where the syntax breaks. The step editor shows it as lines under the
// formula and as underlines on the text; this is the one place it is worked out.

/** The formula a step is edited as; a call step that hasn't been converted yet reads as its formula. */
export function stepExpression(step: CalculatorStep, library: Pick<CalculatorLibrary, 'functions'>): string {
  if (step.source.type === 'expression') return step.source.expression;
  return step.source.functionName ? callToExpression(step.source, library.functions) : '';
}

export interface StepAnalysis {
  expression: string;
  /** What the names in a formula can be */
  formulaNames: FormulaNames;
  /** Names the formula uses that nothing matches, once the error has settled, each offered as a new input */
  unknownNames: string[];
  unitAnalysis: UnitAnalysis;
  /** Wrong argument counts and kinds, and unit problems, each with where it sits */
  callProblems: CallProblem[];
  issues: FormulaIssue[];
  /** Where the formula's syntax breaks, when it does */
  syntaxRange: { start: number; end: number } | null;
}

export function analyzeStepFormula({
  step,
  result,
  calculator,
  library,
}: {
  step: CalculatorStep;
  result: StepResult | undefined;
  calculator: Calculator;
  library: CalculatorLibrary;
}): StepAnalysis {
  const expression = stepExpression(step, library);
  const formulaNames = calculatorFormulaNames(calculator, library);

  const unknown = unknownNameIn(result?.message);
  let unknownNames: string[] = [];
  if (unknown) {
    const names = unknownValueNames(expression, formulaNames);
    unknownNames = names.length > 0 ? names : [unknown];
  }

  // Units put together that don't match, or a result of another kind than the step is set to.
  const unitAnalysis = analyzeUnits(expression, calculatorUnitResolver(calculator, library));
  const unitProblems = unitAnalysis.problems.map((problem) => ({ message: problem.message, kind: 'mismatch' as const, start: problem.from, end: problem.to }));
  const declared =
    step.format === 'number' && (step.unitCategory || step.unitSymbol)
      ? declaredUnitProblem(expression, unitAnalysis, { category: declaredCategory(step), symbol: step.unitSymbol }, 'the step is set to')
      : null;
  if (declared) unitProblems.push({ message: declared.message, kind: 'mismatch', start: declared.from, end: declared.to });
  const callProblems = [...findCallProblems(expression, calculator, library), ...unitProblems];

  const issues = classifyStepIssues({ result, unknownNames, callProblems });
  const syntaxRange = issues.some((issue) => issue.level === 'broken') ? findFormulaErrorRange(expression) : null;
  return { expression, formulaNames, unknownNames, unitAnalysis, callProblems, issues, syntaxRange };
}

/** The same problems, pinned to the text they're about: hover one for its message and its fix. */
export function stepDiagnostics(
  analysis: StepAnalysis,
  library: Pick<CalculatorLibrary, 'functions'>,
  createInput: (name: string, param?: ParamSpec) => void
): FormulaDiagnostic[] {
  const { expression, formulaNames, unknownNames, issues, syntaxRange, callProblems } = analysis;
  return collectDiagnostics({
    syntax: { range: syntaxRange, message: issues.find((issue) => issue.level === 'broken' && !issue.name)?.message },
    unknownNames: {
      ranges: unknownNameRanges(expression, formulaNames),
      names: unknownNames,
      message: (name) => `${name} isn’t an input or step yet.`,
      fixes: (name) => [{ label: `Create input “${name}”`, run: () => createInput(name, parameterFor(expression, name, library)) }],
    },
    problems: callProblems.map((problem) => ({
      from: problem.start,
      to: problem.end,
      level: problem.kind === 'arguments' ? ('broken' as const) : ('heads-up' as const),
      message: problem.message,
    })),
  });
}
