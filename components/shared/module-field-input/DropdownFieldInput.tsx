import { Select } from "@/components/ui/Select";
import { convertFromBase, normalizeToBase } from "@/lib/units";
import { FieldInputShell } from "./FieldInputShell";
import { FieldLinkBadge } from "./FieldLinkBadge";
import { FieldLinkSelect } from "./FieldLinkSelect";
import type { FieldRendererProps } from "./types";

export function DropdownFieldInput({
  field,
  value,
  onChange,
  isLinked,
  canLink,
  linkProps,
}: FieldRendererProps) {
  const options = field.options || [];
  const isNumeric = field.dropdownMode === "numeric" && field.unitSymbol;

  if (isNumeric && field.unitSymbol) {
    return (
      <NumericDropdownFieldInput
        field={field}
        value={value}
        onChange={onChange}
        isLinked={isLinked}
        canLink={canLink}
        linkProps={linkProps}
        options={options}
      />
    );
  }

  if (isLinked) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center">
          <Select
            label=""
            value={value?.toString() || ""}
            disabled={true}
            options={[{ value: value?.toString() || "", label: value?.toString() || "" }]}
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
        <Select
          label=""
          value={value?.toString() || ""}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          options={[
            { value: "", label: "Select..." },
            ...options.map((opt) => ({ value: opt, label: opt })),
          ]}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}

function NumericDropdownFieldInput({
  field,
  value,
  onChange,
  isLinked,
  canLink,
  linkProps,
  options,
}: FieldRendererProps & { options: string[] }) {
  const displayOptions = options.map((opt) => {
    const numValue = Number(opt.trim());
    return !isNaN(numValue) ? `${opt.trim()} ${field.unitSymbol}` : opt;
  });

  let currentDisplayValue = "";
  if (typeof value === "number" && field.unitSymbol) {
    const displayVal = convertFromBase(value, field.unitSymbol);
    const matchIdx = options.findIndex((opt) => {
      const optNum = Number(opt.trim());
      return !isNaN(optNum) && Math.abs(optNum - displayVal) < 0.0001;
    });
    currentDisplayValue =
      matchIdx >= 0 ? displayOptions[matchIdx] : `${displayVal} ${field.unitSymbol}`;
  } else {
    currentDisplayValue = value?.toString() || "";
  }

  if (isLinked) {
    return (
      <FieldInputShell field={field} isLinked={isLinked} canLink={canLink} linkProps={linkProps}>
        <div className="relative h-[46px] flex items-center overflow-visible">
          <Select
            label=""
            value={currentDisplayValue}
            disabled={true}
            options={[{ value: currentDisplayValue, label: currentDisplayValue }]}
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
        <Select
          label=""
          value={currentDisplayValue}
          onChange={(e) => {
            const selectedDisplay = e.target.value;
            const match = selectedDisplay.match(/^([\d.]+)/);
            if (match && field.unitSymbol) {
              const numValue = Number(match[1]);
              if (!isNaN(numValue)) {
                const baseValue = normalizeToBase(numValue, field.unitSymbol);
                onChange(baseValue);
              }
            }
          }}
          options={[
            { value: "", label: "Select..." },
            ...displayOptions.map((displayOpt) => ({
              value: displayOpt,
              label: displayOpt,
            })),
          ]}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}
