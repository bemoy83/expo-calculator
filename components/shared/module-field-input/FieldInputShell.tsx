import type { ReactNode } from "react";
import { FieldDescription, FieldHeader } from "@/components/module-editor/FieldHeader";
import type { Field } from "@/lib/types";
import type { LinkProps } from "./types";

interface FieldInputShellProps {
  field: Field;
  isLinked?: boolean;
  canLink?: boolean;
  linkProps?: LinkProps;
  children: ReactNode;
  footer?: ReactNode;
}

export function FieldInputShell({
  field,
  isLinked = false,
  canLink = false,
  linkProps,
  children,
  footer,
}: FieldInputShellProps) {
  return (
    <div>
      <FieldHeader
        label={field.label}
        unit={field.unit}
        unitSymbol={field.unitSymbol}
        required={field.required}
        showLink={canLink}
        isLinked={isLinked}
        onLinkClick={() => linkProps?.onToggleLink()}
        onUnlinkClick={() => linkProps?.onUnlink()}
      />

      {children}

      <FieldDescription description={field.description} />
      {footer}
    </div>
  );
}
