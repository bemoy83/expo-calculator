import type {
  LinkOpportunity,
  LinkSource,
  PrimaryModuleInfo,
  TemplateLinkAnalysis,
} from "@/hooks/use-template-link-analysis";

export type SidebarSection = "primaryModule" | "linkSources" | "opportunities" | "quickActions";

export type ExpandedSections = Record<SidebarSection, boolean>;

export type LinkFieldHandler = (
  instanceId: string,
  fieldName: string,
  targetInstanceId: string,
  targetFieldName: string
) => { valid: boolean; error?: string };

export type { LinkOpportunity, LinkSource, PrimaryModuleInfo, TemplateLinkAnalysis };
