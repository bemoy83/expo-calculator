import type { CalculationModule, Quote } from "@/lib/types";
import { useWorkspaceFieldLinking } from "./use-workspace-field-linking";

interface UseQuoteFieldLinkingOptions {
  currentQuote: Quote | null;
  modules: CalculationModule[];
  canLinkFields: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
}

export function useQuoteFieldLinking({
  currentQuote,
  modules,
  canLinkFields,
}: UseQuoteFieldLinkingOptions) {
  return useWorkspaceFieldLinking({
    workspaceModules: currentQuote?.workspaceModules ?? [],
    modules,
    canLinkFields,
  });
}
