export type BrokenFieldLink = { instanceId: string; fieldName: string };

export interface FieldLinkResolution {
  resolvedValues: Record<string, Record<string, any>>;
  brokenLinks: BrokenFieldLink[];
}
