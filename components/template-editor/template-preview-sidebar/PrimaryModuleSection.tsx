import { Building2 } from "lucide-react";
import { TemplatePreviewSectionHeader } from "./TemplatePreviewSectionHeader";
import type { PrimaryModuleInfo } from "./types";

interface PrimaryModuleSectionProps {
  primaryModule: PrimaryModuleInfo;
  expanded: boolean;
  onToggle: () => void;
}

export function PrimaryModuleSection({
  primaryModule,
  expanded,
  onToggle,
}: PrimaryModuleSectionProps) {
  return (
    <div className="space-y-3">
      <TemplatePreviewSectionHeader
        icon={Building2}
        iconClassName="h-4 w-4 text-md-primary"
        title="Primary Module"
        expanded={expanded}
        onToggle={onToggle}
      />

      {expanded && (
        <div className="pl-6">
          <div className="p-3 bg-md-surface-container-highest rounded-xl">
            <p className="text-sm font-medium text-foreground">{primaryModule.name}</p>
            <p className="text-xs text-md-on-surface-variant mt-1.5">
              First module in template hierarchy
            </p>
            {(primaryModule.fieldsAsSource > 0 ||
              primaryModule.computedOutputsAsSource > 0) && (
              <div className="mt-3 space-y-1">
                {primaryModule.fieldsAsSource > 0 && (
                  <div className="text-xs text-md-on-surface-variant">
                    • {primaryModule.fieldsAsSource} field
                    {primaryModule.fieldsAsSource > 1 ? "s" : ""} used as source
                    {primaryModule.fieldsAsSource > 1 ? "s" : ""}
                  </div>
                )}
                {primaryModule.computedOutputsAsSource > 0 && (
                  <div className="text-xs text-md-on-surface-variant">
                    • {primaryModule.computedOutputsAsSource} computed output
                    {primaryModule.computedOutputsAsSource > 1 ? "s" : ""} used as source
                    {primaryModule.computedOutputsAsSource > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
