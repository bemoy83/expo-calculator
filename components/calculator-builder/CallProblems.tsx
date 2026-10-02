'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { findCallProblems, type CallProblem } from '@/lib/calculator/call-context';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';

/** Mistakes in how functions are called in a formula: wrong argument count, unit or kind. */
export function useCallProblems(expression: string, calculator: Calculator, library: CalculatorLibrary): CallProblem[] {
  return useMemo(() => findCallProblems(expression, calculator, library), [expression, calculator, library]);
}

export function CallProblems({ problems }: { problems: CallProblem[] }) {
  if (problems.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5" aria-label="Problems with function calls">
      {problems.map((problem, index) => (
        <li key={`${problem.start}-${index}`} className="flex items-start gap-1.5 text-xs text-draft">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {problem.message}
        </li>
      ))}
    </ul>
  );
}
