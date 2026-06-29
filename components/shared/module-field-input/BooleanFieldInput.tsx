import { Checkbox } from "@/components/ui/Checkbox";
import { FieldInputShell } from "./FieldInputShell";
import { FieldLinkBadge } from "./FieldLinkBadge";
import { FieldLinkSelect } from "./FieldLinkSelect";
import type { FieldRendererProps } from "./types";

export function BooleanFieldInput({
  field,
  value,
  onChange,
  isLinked,
  canLink,
  linkProps,
}: FieldRendererProps) {
  if (isLinked) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center overflow-visible">
          <Checkbox label="" checked={Boolean(value)} disabled={true} />
          <FieldLinkBadge linkProps={linkProps} />
        </div>
      </FieldInputShell>
    );
  }

  if (canLink && linkProps?.linkUIOpen) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center overflow-visible">
          <FieldLinkSelect linkProps={linkProps} />
        </div>
      </FieldInputShell>
    );
  }

  return (
    <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
      <div className="relative h-[46px] flex items-center overflow-visible">
        <Checkbox
          label=""
          checked={Boolean(value)}
          onChange={(e) => {
            onChange(e.target.checked);
          }}
        />
      </div>
    </FieldInputShell>
  );
}
