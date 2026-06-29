import { Chip } from "@/components/ui/Chip";
import { CheckCircle2, Link2 } from "lucide-react";
import { TemplatePreviewSectionHeader } from "./TemplatePreviewSectionHeader";
import type { LinkSource } from "./types";

interface LinkSourcesSectionProps {
  linkSources: LinkSource[];
  expanded: boolean;
  onToggle: () => void;
}

export function LinkSourcesSection({
  linkSources,
  expanded,
  onToggle,
}: LinkSourcesSectionProps) {
  if (linkSources.length === 0) return null;

  return (
    <div className="space-y-3">
      <TemplatePreviewSectionHeader
        icon={Link2}
        iconClassName="h-4 w-4 text-md-primary"
        title="Link Sources"
        count={linkSources.length}
        expanded={expanded}
        onToggle={onToggle}
      />

      {expanded && (
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
  );
}
