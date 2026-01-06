"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  Link2,
  ArrowLeftCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Building2,
  Link as LinkIcon,
  ArrowRightCircle,
  ArrowUp,
  Zap
} from "lucide-react";
import { useState } from "react";
import { useTemplateLinkAnalysis } from "@/hooks/use-template-link-analysis";
import { CalculationModule, QuoteModuleInstance } from "@/lib/types";
import { Button } from "../ui/Button";

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

  const [expandedOpportunities, setExpandedOpportunities] = useState<Set<number>>(new Set());

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleOpportunity = (index: number) => {
    setExpandedOpportunities(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

  // Handler for batch linking
  const handleBatchLink = (minConfidence: number) => {
    const eligibleLinks = linkOpportunities
      .filter(opp => opp.suggestedSources[0]?.confidence >= minConfidence)
      .map(opp => ({
        targetField: `${opp.moduleName}.${opp.fieldLabel}`,
        sourceField: `${opp.suggestedSources[0].moduleName}.${opp.suggestedSources[0].fieldLabel}`,
        confidence: opp.suggestedSources[0].confidence,
        isComputed: opp.suggestedSources[0].isComputedOutput,
        targetInstanceId: opp.moduleInstanceId,
        targetFieldName: opp.fieldVariableName,
        sourceInstanceId: opp.suggestedSources[0].moduleInstanceId,
        sourceFieldName: opp.suggestedSources[0].fieldVariableName,
      }));

    if (eligibleLinks.length === 0) {
      alert(`No suggestions with confidence ≥${minConfidence}%`);
      return;
    }

    const preview = eligibleLinks
      .map(link => `  • ${link.targetField} ← ${link.sourceField} (${link.confidence}%)${link.isComputed ? ' [Computed]' : ''}`)
      .join('\n');

    const confirmed = confirm(
      `Link ${eligibleLinks.length} field${eligibleLinks.length > 1 ? 's' : ''} with confidence ≥${minConfidence}%?\n\n${preview}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    eligibleLinks.forEach(link => {
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

  // Early return for empty template
  if (workspaceModules.length === 0) {
    return (
      <div className="lg:col-span-2">
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

  // Count opportunities by confidence threshold
  const excellentCount = linkOpportunities.filter(opp => opp.suggestedSources[0]?.confidence >= 80).length;
  const goodCount = linkOpportunities.filter(opp => opp.suggestedSources[0]?.confidence >= 60).length;

  return (
    <div className="lg:col-span-2">
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
            <Chip size="sm" variant="default">
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
                  <Chip size="sm" variant="muted">
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
                <div className="space-y-2 pl-6">
                  {linkOpportunities.slice(0, 5).map((opp, idx) => {
                    if (!opp.suggestedSources.length) return null;
                    const isExpanded = expandedOpportunities.has(idx);
                    const bestSuggestion = opp.suggestedSources[0];

                    return (
                      <div key={idx} className="space-y-2">
                        {/* Collapsed header - clickable to expand */}
                        <button
                          onClick={() => toggleOpportunity(idx)}
                          className="w-full flex items-center gap-2 p-2 bg-md-surface-container-highest rounded-2xl border-l-4 border-md-primary hover:bg-md-surface-container-high hover:scale-[1.02] transition-smooth"
                        >
                          <ArrowRightCircle className="h-4 w-4 flex-shrink-0 text-md-primary" />
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-xs font-mono font-semibold text-md-on-surface">
                              {opp.fieldLabel}
                            </div>
                            <div className="text-xs font-mono font-medium text-md-on-surface/80">
                              {opp.moduleName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Chip size="sm" variant="muted" className="text-[10px] text-md-on-surface/80">
                              {opp.suggestedSources.length} {opp.suggestedSources.length === 1 ? 'source' : 'sources'}
                            </Chip>
                            <span className="text-xs font-semibold text-md-on-surface/80">
                              {bestSuggestion.confidence}%
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4h" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {/* Expanded content - show all suggestions */}
                        {isExpanded && (
                          <>
                            {/* Arrow showing flow direction */}
                            <div className="flex items-center justify-center py-0.5">
                              <ArrowUp className="h-4 w-4 text-md-on-surface-variant/50" />
                            </div>

                            {/* All suggested sources */}
                            <div className="space-y-1.5 ml-4">
                              {opp.suggestedSources.map((suggestion, suggIdx) => (
                                <button
                                  key={suggIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyLink(
                                      opp.moduleInstanceId,
                                      opp.fieldVariableName,
                                      suggestion.moduleInstanceId,
                                      suggestion.fieldVariableName
                                    );
                                  }}
                                  className="w-full flex items-center gap-2 p-3 bg-md-surface-container-highest rounded-2xl border-l-4 border-emerald-500 hover:bg-md-surface-container-high hover:border-emerald-600 hover:scale-[1.02] transition-smooth group"
                                  title="Click to apply this suggestion"
                                  aria-label={`Apply link from ${suggestion.moduleName}.${suggestion.fieldLabel} to ${opp.moduleName}.${opp.fieldLabel}`}
                                >
                                  <ArrowLeftCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                  <div className="flex-1 min-w-0 space-y-1 text-left">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="min-w-0">
                                        <div className="text-xs font-mono font-semibold text-md-on-surface/80 truncate">
                                          {suggestion.fieldLabel}
                                        </div>
                                        <div className="text-xs font-mono font-medium text-md-on-surface/70 truncate">
                                          {suggestion.moduleName}
                                        </div>
                                      </div>
                                      {suggestion.isComputedOutput && (
                                        <Chip size="sm" variant="flat" className="text-[10px]">
                                          Computed
                                        </Chip>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-md-on-surface/50 leading-relaxed">
                                      {suggestion.reason}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-emerald-600">
                                    {suggestion.confidence}%
                                  </span>
                                  <LinkIcon className="h-4 w-4 mr-2 text-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                  <Chip size="sm" variant="muted">
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
                          <Chip size="sm" variant="flat">
                            Computed
                          </Chip>
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

          {/* Batch Link Actions */}
          {linkOpportunities.length > 1 && (
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-md-primary" />
                <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                  Batch Actions
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleBatchLink(80)}
                  disabled={excellentCount === 0}
                  variant="primary"
                  size="sm"
                  className="text-xs font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Link ${excellentCount} suggestion${excellentCount !== 1 ? 's' : ''} with 80% or higher confidence`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Link Excellent</span>
                    </div>
                    <span className="text-[10px] opacity-80">
                      ({excellentCount} at ≥80%)
                    </span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleBatchLink(60)}
                  disabled={goodCount === 0}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Link ${goodCount} suggestion${goodCount !== 1 ? 's' : ''} with 60% or higher confidence`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      <span>Link Good</span>
                    </div>
                    <span className="text-[8px] opacity-80">
                      ({goodCount} at ≥60%)
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
