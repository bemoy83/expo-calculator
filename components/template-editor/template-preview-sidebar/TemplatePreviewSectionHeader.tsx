import { Chip } from "@/components/ui/Chip";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ComponentType } from "react";

interface TemplatePreviewSectionHeaderProps {
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  title: string;
  expanded: boolean;
  count?: number;
  onToggle: () => void;
}

export function TemplatePreviewSectionHeader({
  icon: Icon,
  iconClassName,
  title,
  expanded,
  count,
  onToggle,
}: TemplatePreviewSectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-left group"
    >
      <div className="flex items-center gap-2">
        <Icon className={iconClassName} />
        <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
          {title}
        </span>
        {count !== undefined && (
          <Chip size="sm" variant="muted">
            {count}
          </Chip>
        )}
      </div>
      {expanded ? (
        <ChevronDown className="h-4 w-4 text-md-on-surface-variant" />
      ) : (
        <ChevronRight className="h-4 w-4 text-md-on-surface-variant" />
      )}
    </button>
  );
}
