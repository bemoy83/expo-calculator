import { ChevronDown, ChevronRight } from "lucide-react";

interface TemplatePreviewSectionHeaderProps {
  title: string;
  expanded: boolean;
  count?: number;
  onToggle: () => void;
}

export function TemplatePreviewSectionHeader({ title, expanded, count, onToggle }: TemplatePreviewSectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="w-full flex items-center justify-between text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <span className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</span>
        {count !== undefined && <span className="text-[11px] font-numeric text-ink-faint">{count}</span>}
      </span>
      {expanded ? (
        <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      ) : (
        <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      )}
    </button>
  );
}
