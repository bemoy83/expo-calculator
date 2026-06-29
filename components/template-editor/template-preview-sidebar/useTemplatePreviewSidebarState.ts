import { useMemo, useState } from "react";
import type { LinkFieldHandler, LinkOpportunity, SidebarSection } from "./types";

export function useTemplatePreviewSidebarState(
  linkOpportunities: LinkOpportunity[],
  onLinkField: LinkFieldHandler
) {
  const [expandedSections, setExpandedSections] = useState({
    primaryModule: true,
    linkSources: true,
    opportunities: true,
    quickActions: false,
  });
  const [expandedOpportunities, setExpandedOpportunities] = useState<Set<number>>(new Set());

  const confidenceCounts = useMemo(
    () => ({
      excellentCount: countOpportunitiesAtConfidence(linkOpportunities, 80),
      goodCount: countOpportunitiesAtConfidence(linkOpportunities, 60),
    }),
    [linkOpportunities]
  );

  const toggleSection = (section: SidebarSection) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleOpportunity = (index: number) => {
    setExpandedOpportunities((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApplyLink = (
    targetInstanceId: string,
    targetFieldName: string,
    sourceInstanceId: string,
    sourceFieldName: string
  ) => {
    const result = onLinkField(
      targetInstanceId,
      targetFieldName,
      sourceInstanceId,
      sourceFieldName
    );

    if (!result.valid && result.error) {
      console.error("Failed to create link:", result.error);
    }
  };

  const handleBatchLink = (minConfidence: number) => {
    const eligibleLinks = getEligibleBatchLinks(linkOpportunities, minConfidence);

    if (eligibleLinks.length === 0) {
      alert(`No suggestions with confidence ≥${minConfidence}%`);
      return;
    }

    const preview = eligibleLinks
      .map(
        (link) =>
          `  • ${link.targetField} ← ${link.sourceField} (${link.confidence}%)${
            link.isComputed ? " [Computed]" : ""
          }`
      )
      .join("\n");

    const confirmed = confirm(
      `Link ${eligibleLinks.length} field${
        eligibleLinks.length > 1 ? "s" : ""
      } with confidence ≥${minConfidence}%?\n\n${preview}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    eligibleLinks.forEach((link) => {
      const result = onLinkField(
        link.targetInstanceId,
        link.targetFieldName,
        link.sourceInstanceId,
        link.sourceFieldName
      );

      if (result.valid) {
        successCount++;
      } else {
        failCount++;
        console.error(`Failed to link ${link.targetField}:`, result.error);
      }
    });

    if (failCount > 0) {
      alert(`Batch link complete:\n✓ ${successCount} succeeded\n✗ ${failCount} failed (see console)`);
    }
  };

  return {
    expandedSections,
    expandedOpportunities,
    excellentCount: confidenceCounts.excellentCount,
    goodCount: confidenceCounts.goodCount,
    toggleSection,
    toggleOpportunity,
    handleApplyLink,
    handleBatchLink,
  };
}

function countOpportunitiesAtConfidence(
  linkOpportunities: LinkOpportunity[],
  minConfidence: number
): number {
  return linkOpportunities.filter(
    (opportunity) => opportunity.suggestedSources[0]?.confidence >= minConfidence
  ).length;
}

function getEligibleBatchLinks(linkOpportunities: LinkOpportunity[], minConfidence: number) {
  return linkOpportunities
    .filter((opportunity) => opportunity.suggestedSources[0]?.confidence >= minConfidence)
    .map((opportunity) => ({
      targetField: `${opportunity.moduleName}.${opportunity.fieldLabel}`,
      sourceField: `${opportunity.suggestedSources[0].moduleName}.${opportunity.suggestedSources[0].fieldLabel}`,
      confidence: opportunity.suggestedSources[0].confidence,
      isComputed: opportunity.suggestedSources[0].isComputedOutput,
      targetInstanceId: opportunity.moduleInstanceId,
      targetFieldName: opportunity.fieldVariableName,
      sourceInstanceId: opportunity.suggestedSources[0].moduleInstanceId,
      sourceFieldName: opportunity.suggestedSources[0].fieldVariableName,
    }));
}
