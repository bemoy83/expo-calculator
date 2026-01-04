"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  Link2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Building2,
  Link as LinkIcon
} from "lucide-react";
import { useState } from "react";
import { useTemplateLinkAnalysis } from "@/hooks/use-template-link-analysis";
import { CalculationModule, QuoteModuleInstance } from "@/lib/types";

/**
 * TemplatePreviewSidebar Component
 *
 * Visualizes template link topology:
 * - Progress tracking
 * - Primary module indicator
 * - Link sources (fields that others link to)
 * - Link opportunities (suggested links)
 * - Collapsible sections
 */

export interface TemplatePreviewSidebarProps {
  workspaceModules: QuoteModuleInstance[];
  modules: CalculationModule[];
  onLinkField: (
    instanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
}

export function TemplatePreviewSidebar({ workspaceModules, modules, onLinkField }: TemplatePreviewSidebarProps) {
  // Analyze template link topology
  const analysis = useTemplateLinkAnalysis(workspaceModules, modules);

  const [expandedSections, setExpandedSections] = useState({
    primaryModule: true,
    linkSources: true,
    opportunities: true,
    quickActions: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handler for applying a link suggestion
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
      // TODO Phase 3 Enhancements:
      // - Show error toast/notification
      // - Add confirmation dialog for risky links
      // - Add loading state during link creation
      // - Add undo support
      console.error('Failed to create link:', result.error);
    }
    // On success, the hook will re-analyze and the opportunity will disappear
  };

  // Early return for empty template
  if (workspaceModules.length === 0) {
    return (
      <div className="lg:col-span-1">
        <Card className="sticky top-[88px] z-40">
          <div className="text-center py-8">
            <Link2 className="h-12 w-12 text-md-on-surface-variant/30 mx-auto mb-3" />
            <p className="text-sm text-md-on-surface-variant">
              Add modules to see link analysis
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const { stats, primaryModule, linkSources, linkOpportunities } = analysis;

  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-[88px] z-40">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-md-primary">Template Links</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-md-on-surface-variant">
                  {stats.linkedFields} of {stats.totalFields} fields linked
                </p>
                {linkOpportunities.length > 0 && (
                  <>
                    <span className="text-xs text-md-on-surface-variant">•</span>
                    <p className="text-xs text-emerald-600 font-medium">
                      {linkOpportunities.length} {linkOpportunities.length === 1 ? "opportunity" : "opportunities"}
                    </p>
                  </>
                )}
              </div>
            </div>
            <Chip size="sm" variant="primaryTonal">
              {stats.totalModules} {stats.totalModules === 1 ? "module" : "modules"}
            </Chip>
          </div>

          {/* Primary Module Section */}
          {primaryModule && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("primaryModule")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-md-primary" />
                  <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                    Primary Module
                  </span>
                </div>
                {expandedSections.primaryModule ? (
                  <ChevronDown className="h-4 w-4 text-md-on-surface-variant" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-md-on-surface-variant" />
                )}
              </button>

              {expandedSections.primaryModule && (
                <div className="pl-6">
                  <div className="p-3 bg-md-surface-container-highest rounded-xl">
                    <p className="text-sm font-medium text-foreground">{primaryModule.name}</p>
                    <p className="text-xs text-md-on-surface-variant mt-1.5">
                      First module in template hierarchy
                    </p>
                    {(primaryModule.fieldsAsSource > 0 || primaryModule.computedOutputsAsSource > 0) && (
                      <div className="mt-3 space-y-1">
                        {primaryModule.fieldsAsSource > 0 && (
                          <div className="text-xs text-md-on-surface-variant">
                            • {primaryModule.fieldsAsSource} field{primaryModule.fieldsAsSource > 1 ? "s" : ""} used as source{primaryModule.fieldsAsSource > 1 ? "s" : ""}
                          </div>
                        )}
                        {primaryModule.computedOutputsAsSource > 0 && (
                          <div className="text-xs text-md-on-surface-variant">
                            • {primaryModule.computedOutputsAsSource} computed output{primaryModule.computedOutputsAsSource > 1 ? "s" : ""} used as source{primaryModule.computedOutputsAsSource > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Link Opportunities Section */}
          {linkOpportunities.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("opportunities")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                    Link Opportunities
                  </span>
                  <Chip size="sm" variant="ghost">
                    {linkOpportunities.length}
                  </Chip>
                </div>
                {expandedSections.opportunities ? (
                  <ChevronDown className="h-4 w-4 text-md-on-surface-variant" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-md-on-surface-variant" />
                )}
              </button>

              {expandedSections.opportunities && (
                <div className="space-y-3 pl-6">
                  {linkOpportunities.slice(0, 5).map((opp, idx) => {
                    const bestSuggestion = opp.suggestedSources[0];
                    if (!bestSuggestion) return null;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Chip size="sm" variant="primaryTonal" className="font-mono max-w-full min-w-0">
                            {opp.moduleName}.{opp.fieldLabel}
                          </Chip>
                          {!opp.hasLocalValue && (
                            <Chip size="sm" variant="errorTonal">
                              No value
                            </Chip>
                          )}
                        </div>
                        <div className="pl-4 p-2 bg-md-surface-container-highest text-md-on-surface /*border border-md-outline*/ rounded-full">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-md-on-surface-container truncate">
                                  {bestSuggestion.moduleName}.{bestSuggestion.fieldLabel}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600">
                                  {bestSuggestion.confidence}%
                                </span>
                                {bestSuggestion.isComputedOutput && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Computed
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-md-on-surface/50 mt-1">
                                {bestSuggestion.reason}
                              </p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <button
                                onClick={() => handleApplyLink(
                                  opp.moduleInstanceId,
                                  opp.fieldVariableName,
                                  bestSuggestion.moduleInstanceId,
                                  bestSuggestion.fieldVariableName
                                )}
                                className="p-1.5 bg-md-primary text-md-on-primary rounded-full hover:bg-md-primary/10 hover:text-md-primary transition-smooth group"
                                title="Apply this suggestion"
                                aria-label={`Apply link from ${bestSuggestion.moduleName}.${bestSuggestion.fieldLabel} to ${opp.moduleName}.${opp.fieldLabel}`}
                              >
                                <LinkIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {linkOpportunities.length > 5 && (
                    <p className="text-xs text-md-on-surface-variant text-center">
                      +{linkOpportunities.length - 5} more opportunities
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Link Sources Section */}
          {linkSources.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("linkSources")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-md-primary" />
                  <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                    Link Sources
                  </span>
                  <Chip size="sm" variant="ghost">
                    {linkSources.length}
                  </Chip>
                </div>
                {expandedSections.linkSources ? (
                  <ChevronDown className="h-4 w-4 text-md-on-surface-variant" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-md-on-surface-variant" />
                )}
              </button>

              {expandedSections.linkSources && (
                <div className="space-y-6 pl-6">
                  {linkSources.map((source, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground font-medium truncate">
                          {source.moduleName}.{source.fieldVariableName}
                        </span>
                        {source.isComputedOutput && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">
                            Computed
                          </span>
                        )}
                      </div>

                      {/* Linked By */}
                      {source.linkedBy.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-md-on-surface-variant uppercase tracking-wide">
                            Linked by {source.linkedBy.length}:
                          </p>
                          {source.linkedBy.map((link, linkIdx) => (
                            <div key={linkIdx} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                              <span className="font-mono text-md-on-surface-variant truncate">
                                {link.moduleName}.{link.fieldLabel}
                              </span>
                              {link.hasLocalValue && (
                                <span className="text-[10px] text-orange-600 flex-shrink-0">
                                  (local)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions Section - Placeholder for Phase 3 */}
          {linkOpportunities.length > 3 && (
            <div className="pt-4 border-t border-border/50">
              <div className="text-center p-3 bg-md-surface-variant/10 rounded-lg">
                <p className="text-xs text-md-on-surface-variant">
                  Batch link actions coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
