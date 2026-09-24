"use client";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { useTemplateLinkAnalysis } from "@/hooks/use-template-link-analysis";
import type { CalculationModule, QuoteModuleInstance } from "@/lib/types";
import { BatchLinkActions } from "./template-preview-sidebar/BatchLinkActions";
import { LinkOpportunitiesSection } from "./template-preview-sidebar/LinkOpportunitiesSection";
import { LinkSourcesSection } from "./template-preview-sidebar/LinkSourcesSection";
import { TemplatePreviewEmptyState } from "./template-preview-sidebar/TemplatePreviewEmptyState";
import { TemplatePreviewHeader } from "./template-preview-sidebar/TemplatePreviewHeader";
import { useTemplatePreviewSidebarState } from "./template-preview-sidebar/useTemplatePreviewSidebarState";
import type { LinkFieldHandler } from "./template-preview-sidebar/types";

export interface TemplatePreviewSidebarProps {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  onLinkField: LinkFieldHandler;
}

export function TemplatePreviewSidebar({
  workspaceModules,
  modules,
  onLinkField,
}: TemplatePreviewSidebarProps) {
  const analysis = useTemplateLinkAnalysis(workspaceModules, modules);
  const { stats, linkSources, linkOpportunities } = analysis;
  const {
    batchLinkConfirmation,
    confirmBatchLink,
    cancelBatchLink,
    expandedSections,
    expandedOpportunities,
    excellentCount,
    goodCount,
    toggleSection,
    toggleOpportunity,
    handleApplyLink,
    handleBatchLink,
  } = useTemplatePreviewSidebarState(linkOpportunities, onLinkField);

  if (workspaceModules.length === 0) {
    return <TemplatePreviewEmptyState />;
  }

  return (
    <>
      <Card density="dense">
        <div className="space-y-4">
          <TemplatePreviewHeader
            stats={stats}
            opportunityCount={linkOpportunities.length}
          />

          <LinkOpportunitiesSection
            linkOpportunities={linkOpportunities}
            expanded={expandedSections.opportunities}
            expandedOpportunities={expandedOpportunities}
            onToggleSection={() => toggleSection("opportunities")}
            onToggleOpportunity={toggleOpportunity}
            onApplyLink={handleApplyLink}
          />

          <LinkSourcesSection
            linkSources={linkSources}
            expanded={expandedSections.linkSources}
            onToggle={() => toggleSection("linkSources")}
          />

          <BatchLinkActions
            opportunityCount={linkOpportunities.length}
            excellentCount={excellentCount}
            goodCount={goodCount}
            onBatchLink={handleBatchLink}
          />
        </div>
      </Card>
      <ConfirmDialog
        isOpen={!!batchLinkConfirmation}
        title={batchLinkConfirmation?.title ?? ""}
        message={batchLinkConfirmation?.message}
        confirmLabel="Link fields"
        onConfirm={confirmBatchLink}
        onCancel={cancelBatchLink}
      />
    </>
  );
}
