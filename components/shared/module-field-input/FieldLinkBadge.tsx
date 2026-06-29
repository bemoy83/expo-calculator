import { Link2, X } from "lucide-react";
import type { LinkProps } from "./types";

interface FieldLinkBadgeProps {
  linkProps?: LinkProps;
}

export function FieldLinkBadge({ linkProps }: FieldLinkBadgeProps) {
  if (!linkProps?.isLinked) return null;

  const { isLinkBroken, linkDisplayName } = linkProps;

  return (
    <div
      className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full pointer-events-none z-50 ${
        isLinkBroken ? "bg-md-error" : "bg-transparent"
      }`}
    >
      {isLinkBroken ? (
        <X className="h-3.5 w-3.5 text-md-on-error shrink-0" />
      ) : (
        <Link2 className="h-3.5 w-3.5 text-md-primary-container/70 shrink-0" />
      )}
      <span
        className={`text-xs whitespace-nowrap ${
          isLinkBroken ? "text-md-on-error" : "text-md-primary-container/70"
        }`}
      >
        {isLinkBroken ? "Broken link" : linkDisplayName}
      </span>
    </div>
  );
}
