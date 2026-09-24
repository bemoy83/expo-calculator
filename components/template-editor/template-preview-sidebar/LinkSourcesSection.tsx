import { TemplatePreviewSectionHeader } from "./TemplatePreviewSectionHeader";
import type { LinkSource } from "./types";

interface LinkSourcesSectionProps {
  linkSources: LinkSource[];
  expanded: boolean;
  onToggle: () => void;
}

// Values that already flow between modules: one source, the fields that take it.
export function LinkSourcesSection({ linkSources, expanded, onToggle }: LinkSourcesSectionProps) {
  const used = linkSources.filter((source) => source.linkedBy.length > 0);
  if (used.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <TemplatePreviewSectionHeader title="Shared values" count={used.length} expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <ul className="space-y-2">
          {used.map((source) => (
            <li key={`${source.moduleInstanceId}-${source.fieldVariableName}`} className="text-xs">
              <p className="font-semibold text-ink">
                {source.moduleName} · {source.isComputedOutput ? source.fieldLabel || source.fieldVariableName : source.fieldLabel}
                {source.isComputedOutput && <span className="font-normal text-ink-faint"> (output)</span>}
              </p>
              <p className="text-ink-muted">
                feeds {source.linkedBy.map((link) => `${link.moduleName} · ${link.fieldLabel}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
