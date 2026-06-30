import { Input } from "@/components/ui/Input";
import { getFieldInputPlaceholder, handleSelectDefaultOnFocus } from "@/lib/field-defaults";
import { FieldInputShell } from "./FieldInputShell";
import { FieldLinkBadge } from "./FieldLinkBadge";
import { FieldLinkSelect } from "./FieldLinkSelect";
import type { FieldRendererProps } from "./types";

export function TextFieldInput({
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
        <div className="relative h-[46px] flex items-center">
          <Input
            label=""
            value={value?.toString() || ""}
            disabled={true}
            className="w-full pr-32"
          />
          <FieldLinkBadge linkProps={linkProps} />
        </div>
      </FieldInputShell>
    );
  }

  if (canLink && linkProps?.linkUIOpen) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center">
          <FieldLinkSelect linkProps={linkProps} />
        </div>
      </FieldInputShell>
    );
  }

  return (
    <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
      <div className="relative h-[46px] flex items-center">
        <Input
          label=""
          value={value?.toString() || ""}
          placeholder={getFieldInputPlaceholder(field)}
          onFocus={(event) => handleSelectDefaultOnFocus(event, field, value)}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          required={field.required}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}
