import { useMemo, useState } from "react";
import { notify } from "@/lib/stores/notifications-store";
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
  const [pendingBatchLink, setPendingBatchLink] = useState<{
    minConfidence: number;
    links: EligibleBatchLink[];
  } | null>(null);

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
      notify({ variant: "info", message: "No matching suggestions to link." });
      return;
    }

    setPendingBatchLink({ minConfidence, links: eligibleLinks });
  };

  const cancelBatchLink = () => setPendingBatchLink(null);

  const confirmBatchLink = () => {
    if (!pendingBatchLink) return;
    const eligibleLinks = pendingBatchLink.links;
    setPendingBatchLink(null);

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
      notify({
        variant: "warning",
        message: `Linked ${successCount} of ${successCount + failCount} fields; ${failCount} could not be linked (incompatible or circular).`,
      });
    }
  };

  const batchLinkConfirmation = pendingBatchLink
    ? {
        title: `Link ${pendingBatchLink.links.length} field${pendingBatchLink.links.length > 1 ? "s" : ""}?`,
        message: `${pendingBatchLink.links
          .map((link) => `• ${link.targetField} ← ${link.sourceField}${link.isComputed ? " (output)" : ""}`)
          .join("\n")}\n\nYou can unlink any of them afterwards.`,
      }
    : null;

  return {
    batchLinkConfirmation,
    confirmBatchLink,
    cancelBatchLink,
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

type EligibleBatchLink = ReturnType<typeof getEligibleBatchLinks>[number];

function getEligibleBatchLinks(linkOpportunities: LinkOpportunity[], minConfidence: number) {
  return linkOpportunities
    .filter((opportunity) => opportunity.suggestedSources[0]?.confidence >= minConfidence)
    .map((opportunity) => ({
      targetField: `${opportunity.fieldLabel} in ${opportunity.moduleName}`,
      sourceField: `${opportunity.suggestedSources[0].moduleName} · ${opportunity.suggestedSources[0].fieldLabel}`,
      confidence: opportunity.suggestedSources[0].confidence,
      isComputed: opportunity.suggestedSources[0].isComputedOutput,
      targetInstanceId: opportunity.moduleInstanceId,
      targetFieldName: opportunity.fieldVariableName,
      sourceInstanceId: opportunity.suggestedSources[0].moduleInstanceId,
      sourceFieldName: opportunity.suggestedSources[0].fieldVariableName,
    }));
}
