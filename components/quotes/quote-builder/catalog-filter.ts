import type { CalculationModule, ModuleTemplate } from "@/lib/types";

export function getQuoteBuilderCategories(input: {
  modules: CalculationModule[];
  templates: ModuleTemplate[];
}): string[] {
  return Array.from(
    new Set([
      ...input.modules.map((module) => module.category).filter(Boolean) as string[],
      ...input.templates.flatMap((template) => template.categories),
    ])
  ).sort();
}

export function filterQuoteBuilderCatalog(input: {
  modules: CalculationModule[];
  templates: ModuleTemplate[];
  selectedCategory: string | null;
}): {
  allCategories: string[];
  filteredModules: CalculationModule[];
  filteredTemplates: ModuleTemplate[];
} {
  const allCategories = getQuoteBuilderCategories(input);

  if (input.selectedCategory === null) {
    return {
      allCategories,
      filteredModules: input.modules,
      filteredTemplates: input.templates,
    };
  }

  return {
    allCategories,
    filteredModules: input.modules.filter((module) => module.category === input.selectedCategory),
    filteredTemplates: input.templates.filter((template) =>
      template.categories.includes(input.selectedCategory as string)
    ),
  };
}
