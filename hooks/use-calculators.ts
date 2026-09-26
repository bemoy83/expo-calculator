import { useMemo } from 'react';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';

// The saved calculators. (Modules and templates became saved calculators when they were
// retired; see lib/calculator/legacy.ts.)
export function useCalculators(): Calculator[] {
  return useCalculatorsStore((state) => state.calculators);
}

export function useCalculatorLibrary(): CalculatorLibrary {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const functions = useFunctionsStore((state) => state.functions);
  return useMemo(() => ({ materials, labor, functions }), [materials, labor, functions]);
}
