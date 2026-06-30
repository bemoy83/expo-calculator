import { Input } from "@/components/ui/Input";
import { handleSelectDefaultOnFocus } from "@/lib/field-defaults";
import { convertFromBase, normalizeToBase } from "@/lib/units";
import { formatDisplayNumber } from "@/lib/utils";
import { FieldInputShell } from "./FieldInputShell";
import { FieldLinkBadge } from "./FieldLinkBadge";
import { FieldLinkSelect } from "./FieldLinkSelect";
import type { FieldRendererProps } from "./types";

export function NumberFieldInput({
  field,
  value,
  onChange,
  isLinked,
  canLink,
  linkProps,
}: FieldRendererProps) {
  const displayValue =
    typeof value === "number"
      ? field.unitSymbol
        ? convertFromBase(value, field.unitSymbol)
        : value
      : 0;

  if (isLinked) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center overflow-visible">
          <Input
            type="number"
            value={formatDisplayNumber(displayValue)}
            disabled={true}
            onFocus={(event) => handleSelectDefaultOnFocus(event, field, displayValue)}
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
        <div className="relative h-[46px] flex items-center overflow-visible">
          <FieldLinkSelect linkProps={linkProps} />
        </div>
      </FieldInputShell>
    );
  }

  return (
    <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
      <div className="relative h-[46px] flex items-center overflow-visible">
        <Input
          type="number"
          value={formatDisplayNumber(displayValue)}
          onFocus={(event) => handleSelectDefaultOnFocus(event, field, displayValue)}
          onChange={(e) => {
            const inputValue = e.target.value === "" ? 0 : Number(e.target.value) || 0;
            const baseValue =
              field.unitSymbol && typeof inputValue === "number"
                ? normalizeToBase(inputValue, field.unitSymbol)
                : inputValue;
            onChange(baseValue);
          }}
          required={field.required}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}
