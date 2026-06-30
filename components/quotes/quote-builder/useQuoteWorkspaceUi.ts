import { useState } from "react";
import type { Quote, QuoteModuleInstance } from "@/lib/types";

export function useQuoteWorkspaceUi(input: {
  currentQuote: Quote | null;
  reorderWorkspaceModules: (newOrder: QuoteModuleInstance[]) => void;
}) {
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const handleReorder = (oldIndex: number, newIndex: number) => {
    if (!input.currentQuote) return;
    if (oldIndex === newIndex) return;

    const items = input.currentQuote.workspaceModules;
    if (!items[oldIndex] || !items[newIndex]) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    input.reorderWorkspaceModules(reordered);
  };

  const toggleModuleCollapse = (instanceId: string) => {
    setCollapsedModules((prev) => {
      const updated = new Set(prev);
      if (updated.has(instanceId)) {
        updated.delete(instanceId);
      } else {
        updated.add(instanceId);
      }
      return updated;
    });
  };

  return {
    collapsedModules,
    handleReorder,
    toggleModuleCollapse,
  };
}
