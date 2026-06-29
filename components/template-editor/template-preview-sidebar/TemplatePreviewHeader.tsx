import { Chip } from "@/components/ui/Chip";
import type { TemplateLinkAnalysis } from "./types";

interface TemplatePreviewHeaderProps {
  stats: TemplateLinkAnalysis["stats"];
  opportunityCount: number;
}

export function TemplatePreviewHeader({
  stats,
  opportunityCount,
}: TemplatePreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-md-primary">Template Links</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-md-on-surface-variant">
            {stats.linkedFields} of {stats.totalFields} fields linked
          </p>
          {opportunityCount > 0 && (
            <>
              <span className="text-xs text-md-on-surface-variant">•</span>
              <p className="text-xs text-emerald-600 font-medium">
                {opportunityCount} {opportunityCount === 1 ? "opportunity" : "opportunities"}
              </p>
            </>
          )}
        </div>
      </div>
      <Chip size="sm" variant="default">
        {stats.totalModules} {stats.totalModules === 1 ? "module" : "modules"}
      </Chip>
    </div>
  );
}
