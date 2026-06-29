"use client";

import { useMemo } from "react";
import { analyzeTemplateLinks, type TemplateLinkAnalysis } from "@/lib/templates/template-link-analysis";
import type { CalculationModule, QuoteModuleInstance } from "@/lib/types";

export type {
  LinkOpportunity,
  LinkSource,
  PrimaryModuleInfo,
  SuggestedSource,
  TemplateLinkAnalysis,
} from "@/lib/templates/template-link-analysis";

export function useTemplateLinkAnalysis(
  workspaceModules: QuoteModuleInstance[],
  modules: CalculationModule[]
): TemplateLinkAnalysis {
  return useMemo(
    () => analyzeTemplateLinks({ workspaceModules, modules }),
    [workspaceModules, modules]
  );
}
