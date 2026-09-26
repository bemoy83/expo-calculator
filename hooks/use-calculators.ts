import { useMemo } from 'react';
import { calculatorsFromModules } from '@/lib/calculator/from-module';
import { calculatorsFromTemplates } from '@/lib/calculator/from-template';
import type { Calculator, CalculatorLibrary } from '@/lib/calculator/types';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useTemplatesStore } from '@/lib/stores/templates-store';

/**
 * Where a calculator shown on the fly comes from: a module or a template (converted each
 * time, so it follows their edits), as opposed to a saved calculator.
 */
export function convertedFrom(calculator: Calculator): 'module' | 'template' | undefined {
  if (calculator.id.startsWith('module-')) return 'module';
  if (calculator.id.startsWith('template-')) return 'template';
  return undefined;
}

/** The on-the-fly calculator of a saved calculator's source, to return to. */
export function sourceViewId(calculator: Calculator): string | undefined {
  if (calculator.sourceTemplateId) return `template-${calculator.sourceTemplateId}`;
  if (calculator.sourceModuleId) return `module-${calculator.sourceModuleId}`;
  return undefined;
}

// Saved calculators, then every template and module shown as a calculator (converted on the
// fly until they are retired, so their edits show up straight away). One that has been saved
// as a calculator is shown only as that calculator.
export function useCalculators(): Calculator[] {
  const saved = useCalculatorsStore((state) => state.calculators);
  const modules = useModulesStore((state) => state.modules);
  const templates = useTemplatesStore((state) => state.templates);
  const fromModules = useMemo(() => calculatorsFromModules(modules), [modules]);
  const fromTemplates = useMemo(() => calculatorsFromTemplates(templates, modules), [templates, modules]);
  return useMemo(() => {
    const savedModules = new Set(saved.map((calculator) => calculator.sourceModuleId).filter(Boolean));
    const savedTemplates = new Set(saved.map((calculator) => calculator.sourceTemplateId).filter(Boolean));
    return [
      ...saved,
      ...fromTemplates.filter((calculator) => !savedTemplates.has(calculator.sourceTemplateId)),
      ...fromModules.filter((calculator) => !savedModules.has(calculator.sourceModuleId)),
    ];
  }, [saved, fromModules, fromTemplates]);
}

export function useCalculatorLibrary(): CalculatorLibrary {
  const materials = useMaterialsStore((state) => state.materials);
  const labor = useLaborStore((state) => state.labor);
  const functions = useFunctionsStore((state) => state.functions);
  return useMemo(() => ({ materials, labor, functions }), [materials, labor, functions]);
}
