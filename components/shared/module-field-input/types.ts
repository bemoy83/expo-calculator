import type { Field, Labor, Material } from "@/lib/types";

export type FieldInputValue = string | number | boolean | undefined;

export type LinkOption = { value: string; label: string };

export interface LinkProps {
  canLink: boolean;
  isLinked: boolean;
  isLinkBroken: boolean;
  linkDisplayName: string;
  linkUIOpen: boolean;
  currentLinkValue: string;
  linkOptions: LinkOption[];
  onToggleLink: () => void;
  onLinkChange: (value: string) => void;
  onUnlink: () => void;
}

export interface ModuleFieldInputProps {
  field: Field;
  value: FieldInputValue;
  materials?: Material[];
  labor?: Labor[];
  onChange: (val: string | number | boolean) => void;
  linkProps?: LinkProps;
}

export interface FieldRendererProps {
  field: Field;
  value: FieldInputValue;
  onChange: (val: string | number | boolean) => void;
  isLinked: boolean;
  canLink: boolean;
  linkProps?: LinkProps;
}
