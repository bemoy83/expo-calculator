import { Select } from "@/components/ui/Select";
import type { LinkProps } from "./types";

interface FieldLinkSelectProps {
  linkProps: LinkProps;
  className?: string;
}

export function FieldLinkSelect({
  linkProps,
  className = "w-full",
}: FieldLinkSelectProps) {
  return (
    <Select
      label=""
      value=""
      onChange={(e) => {
        linkProps.onLinkChange(e.target.value);
      }}
      options={[{ value: "", label: "Select..." }, ...linkProps.linkOptions]}
      className={className}
    />
  );
}
