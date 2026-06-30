import { useMemo, useState } from "react";
import type { CalculationModule, ModuleTemplate } from "@/lib/types";
import { filterQuoteBuilderCatalog } from "./catalog-filter";

export function useQuoteCatalogFilter(input: {
  modules: CalculationModule[];
  templates: ModuleTemplate[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const catalog = useMemo(
    () =>
      filterQuoteBuilderCatalog({
        modules: input.modules,
        templates: input.templates,
        selectedCategory,
      }),
    [input.modules, input.templates, selectedCategory]
  );

  return {
    selectedCategory,
    setSelectedCategory,
    ...catalog,
  };
}
