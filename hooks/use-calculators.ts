import { useMemo } from 'react';
import { calculatorsFromModules } from '@/lib/calculator/from-module';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';

// Saved calculators, followed by every module shown as a calculator (converted on the fly
// until modules are retired, so a module edit shows up straight away).
export function useCalculators(): Calculator[] {
  const saved = useCalculatorsStore((state) => state.calculators);
  const modules = useModulesStore((state) => state.modules);
  const fromModules = useMemo(() => calculatorsFromModules(modules), [modules]);
  return useMemo(() => [...saved, ...fromModules], [saved, fromModules]);
}

export function useCalculatorLibrary(): CalculatorLibrary {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const functions = useFunctionsStore((state) => state.functions);
  return useMemo(() => ({ materials, labor, functions }), [materials, labor, functions]);
}
