import type { TemplateLinkAnalysis } from "./types";

interface TemplatePreviewHeaderProps {
  stats: TemplateLinkAnalysis["stats"];
  opportunityCount: number;
}

export function TemplatePreviewHeader({ stats, opportunityCount }: TemplatePreviewHeaderProps) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">How the modules connect</h2>
      <p className="text-xs text-ink-muted mt-0.5">
        <span className="font-numeric">{stats.linkedFields}</span> of{" "}
        <span className="font-numeric">{stats.totalFields}</span> fields take their value from another module
        {opportunityCount > 0 && (
          <>
            {" · "}
            <span className="text-action font-medium">{opportunityCount} suggested</span>
          </>
        )}
      </p>
    </div>
  );
}
