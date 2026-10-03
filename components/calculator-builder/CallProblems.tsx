'use client';

import { useMemo } from 'react';
import { findCallProblems, type CallProblem } from '@/lib/calculator/call-context';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';

/** Mistakes in how functions are called in a formula: wrong argument count, unit or kind. */
export function useCallProblems(expression: string, calculator: Calculator, library: CalculatorLibrary): CallProblem[] {
  return useMemo(() => findCallProblems(expression, calculator, library), [expression, calculator, library]);
}
