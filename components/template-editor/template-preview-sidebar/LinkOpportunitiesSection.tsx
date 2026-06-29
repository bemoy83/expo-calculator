import { Chip } from "@/components/ui/Chip";
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { TemplatePreviewSectionHeader } from "./TemplatePreviewSectionHeader";
import type { LinkOpportunity } from "./types";

interface LinkOpportunitiesSectionProps {
  linkOpportunities: LinkOpportunity[];
  expanded: boolean;
  expandedOpportunities: Set<number>;
  onToggleSection: () => void;
  onToggleOpportunity: (index: number) => void;
  onApplyLink: (
    targetInstanceId: string,
    targetFieldName: string,
    sourceInstanceId: string,
    sourceFieldName: string
  ) => void;
}

export function LinkOpportunitiesSection({
  linkOpportunities,
  expanded,
  expandedOpportunities,
  onToggleSection,
  onToggleOpportunity,
  onApplyLink,
}: LinkOpportunitiesSectionProps) {
  if (linkOpportunities.length === 0) return null;

  return (
    <div className="space-y-3">
      <TemplatePreviewSectionHeader
        icon={Sparkles}
        iconClassName="h-4 w-4 text-emerald-500"
        title="Link Opportunities"
        count={linkOpportunities.length}
        expanded={expanded}
        onToggle={onToggleSection}
      />

      {expanded && (
        <div className="space-y-2 pl-6">
          {linkOpportunities.slice(0, 5).map((opportunity, idx) => {
            if (!opportunity.suggestedSources.length) return null;
            const isExpanded = expandedOpportunities.has(idx);
            const bestSuggestion = opportunity.suggestedSources[0];

            return (
              <div key={idx} className="space-y-2">
                <button
                  onClick={() => onToggleOpportunity(idx)}
                  className="w-full flex items-center gap-2 p-2 bg-md-surface-container-highest rounded-2xl border-l-4 border-md-primary hover:bg-md-surface-container-high hover:scale-[1.02] transition-smooth"
                >
                  <ArrowRightCircle className="h-4 w-4 flex-shrink-0 text-md-primary" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-mono font-semibold text-md-on-surface">
                      {opportunity.fieldLabel}
                    </div>
                    <div className="text-xs font-mono font-medium text-md-on-surface/80">
                      {opportunity.moduleName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Chip size="sm" variant="muted" className="text-[10px] text-md-on-surface/80">
                      {opportunity.suggestedSources.length}{" "}
                      {opportunity.suggestedSources.length === 1 ? "source" : "sources"}
                    </Chip>
                    <span className="text-xs font-semibold text-md-on-surface/80">
                      {bestSuggestion.confidence}%
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <>
                    <div className="flex items-center justify-center py-0.5">
                      <ArrowUp className="h-4 w-4 text-md-on-surface-variant/50" />
                    </div>

                    <div className="space-y-1.5 ml-4">
                      {opportunity.suggestedSources.map((suggestion, suggIdx) => (
                        <button
                          key={suggIdx}
                          onClick={(event) => {
                            event.stopPropagation();
                            onApplyLink(
                              opportunity.moduleInstanceId,
                              opportunity.fieldVariableName,
                              suggestion.moduleInstanceId,
                              suggestion.fieldVariableName
                            );
                          }}
                          className="w-full flex items-center gap-2 p-3 bg-md-surface-container-highest rounded-2xl border-l-4 border-emerald-500 hover:bg-md-surface-container-high hover:border-emerald-600 hover:scale-[1.02] transition-smooth group"
                          title="Click to apply this suggestion"
                          aria-label={`Apply link from ${suggestion.moduleName}.${suggestion.fieldLabel} to ${opportunity.moduleName}.${opportunity.fieldLabel}`}
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
  );
}
