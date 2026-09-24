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

const VISIBLE = 6;

// Plain-language suggestions: "Width in Sheet Installation can use Framing · Width", with the
// matching reasons instead of confidence percentages.
export function LinkOpportunitiesSection({
  linkOpportunities,
  expanded,
  expandedOpportunities,
  onToggleSection,
  onToggleOpportunity,
  onApplyLink,
}: LinkOpportunitiesSectionProps) {
  const withSources = linkOpportunities.filter((opportunity) => opportunity.suggestedSources.length > 0);
  if (withSources.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <TemplatePreviewSectionHeader
        title="Suggested links"
        count={withSources.length}
        expanded={expanded}
        onToggle={onToggleSection}
      />

      {expanded && (
        <ul className="space-y-2">
          {withSources.slice(0, VISIBLE).map((opportunity, idx) => {
            const [best, ...others] = opportunity.suggestedSources;
            const showOthers = expandedOpportunities.has(idx);
            return (
              <li key={`${opportunity.moduleInstanceId}-${opportunity.fieldVariableName}`} className="p-2.5 rounded-md border border-border">
                <SuggestionRow
                  target={`${opportunity.fieldLabel} in ${opportunity.moduleName}`}
                  source={`${best.moduleName} · ${best.fieldLabel}${best.isComputedOutput ? " (output)" : ""}`}
                  reason={best.reason}
                  onLink={() =>
                    onApplyLink(opportunity.moduleInstanceId, opportunity.fieldVariableName, best.moduleInstanceId, best.fieldVariableName)
                  }
                />
                {others.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggleOpportunity(idx)}
                      aria-expanded={showOthers}
                      className="mt-1.5 text-[11px] font-medium text-ink-muted hover:text-ink rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    >
                      {showOthers ? "Hide other options" : `${others.length} other ${others.length === 1 ? "option" : "options"}`}
                    </button>
                    {showOthers && (
                      <ul className="mt-1.5 space-y-1.5 pl-2.5 border-l border-border">
                        {others.map((suggestion) => (
                          <li key={`${suggestion.moduleInstanceId}-${suggestion.fieldVariableName}`}>
                            <SuggestionRow
                              source={`${suggestion.moduleName} · ${suggestion.fieldLabel}${suggestion.isComputedOutput ? " (output)" : ""}`}
                              reason={suggestion.reason}
                              onLink={() =>
                                onApplyLink(
                                  opportunity.moduleInstanceId,
                                  opportunity.fieldVariableName,
                                  suggestion.moduleInstanceId,
                                  suggestion.fieldVariableName
                                )
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {withSources.length > VISIBLE && (
            <li className="text-xs text-ink-faint text-center">+{withSources.length - VISIBLE} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function SuggestionRow({
  target,
  source,
  reason,
  onLink,
}: {
  target?: string;
  source: string;
  reason: string;
  onLink: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0 text-xs">
        {target && <p className="font-semibold text-ink">{target}</p>}
        <p className="text-ink-body">
          {target ? "can use " : ""}
          <span className="font-medium text-action">{source}</span>
        </p>
        {reason && <p className="text-[11px] text-ink-faint">{reason.toLowerCase()}</p>}
      </div>
      <button
        type="button"
        onClick={onLink}
        aria-label={`Link ${target ? `${target} to ` : ""}${source}`}
        className="shrink-0 px-2 py-1 rounded-md border border-border-strong bg-surface text-[11px] font-semibold text-action hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        Link
      </button>
    </div>
  );
}
