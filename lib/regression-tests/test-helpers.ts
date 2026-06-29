import assert from 'node:assert/strict';
import { evaluateFormula, type EvaluationContext } from '../formula-evaluator';

export { assert };

export function testFormula(
  formula: string,
  expected: number,
  context: EvaluationContext = { fieldValues: {}, materials: [] }
) {
  const result = evaluateFormula(formula, context);
  assert.ok(
    Math.abs(result - expected) < 0.0001,
    `${formula} expected ${expected}, got ${result}`
  );
  console.log(`✓ ${formula} = ${result} (expected: ${expected})`);
}

export function assertCheck(label: string, passed: boolean, detail?: string) {
  assert.ok(passed, detail ? `${label}: ${detail}` : label);
  console.log(`✓ ${label}${detail ? ` - ${detail}` : ''}`);
}

export function assertThrowsFormula(label: string, formula: string, expectedMessage: string) {
  assert.throws(
    () => evaluateFormula(formula, { fieldValues: {}, materials: [] }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes(expectedMessage),
    `${label} should throw "${expectedMessage}"`
  );
  console.log(`✓ ${label} correctly throws`);
}
