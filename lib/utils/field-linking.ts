export type { BrokenFieldLink, FieldLinkResolution } from "./field-linking/types";
export {
  removeBrokenFieldLinks,
  resolveFieldLinks,
  resolveFieldLinksWithMetadata,
} from "./field-linking/resolution";
export {
  areTypesCompatible,
  canLinkFields,
  detectCircularReference,
} from "./field-linking/validation";
