import type { Material, SharedFunctionParameter } from "../types";
import { editDistance, sameCategory } from '../utils/material-category';

// What properties the catalog's materials have, and the typos in `material.property` references to ones nothing has.

export type MaterialPropertyInfo = { name: string; unitSymbol?: string; count: number; total: number };

/**
 * Every property name the catalog's materials define, with how many have each. Nothing is
 * assumed: a property no material has isn't offered, since a call couldn't pass a value for it. A material parameter doesn't know its material until a
 * calculator picks one, so this is what `board.` can offer.
 */
export function getMaterialPropertyCatalog(allMaterials: Material[], category?: string): MaterialPropertyInfo[] {
  const materials = category ? allMaterials.filter((material) => sameCategory(material.category, category)) : allMaterials;
  const found = new Map<string, MaterialPropertyInfo>();
  const total = materials.length;
  materials.forEach((material) => {
    const seen = new Set<string>();
    material.properties?.forEach((prop) => {
      const name = prop.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      const info = found.get(key) ?? { name, unitSymbol: prop.unitSymbol, count: 0, total };
      info.count += 1;
      info.unitSymbol ??= prop.unitSymbol;
      found.set(key, info);
    });
  });
  return Array.from(found.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** A parameter is a material when marked so, or (kind left automatic) once the formula uses a dot on it. */
function isMaterialParameter(param: SharedFunctionParameter, formula: string): boolean {
  if (param.kind) return param.kind === "material";
  const escaped = param.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return !!param.name.trim() && new RegExp(`(^|[^\\w.])${escaped}\\.`).test(formula);
}

/**
 * `board.widht` where no material has a `widht`: the likely typos, each with the property it
 * probably meant. A property some materials lack is not flagged; only names found nowhere.
 */
export function findUnknownMaterialProperties(input: {
  formula: string;
  parameters: SharedFunctionParameter[];
  materials: Material[];
}): Array<{ reference: string; suggestion?: string }> {
  const unknown = new Map<string, { reference: string; suggestion?: string }>();
  input.parameters.forEach((param) => {
    const name = param.name.trim();
    if (!name || !isMaterialParameter(param, input.formula)) return;
    const known = getMaterialPropertyCatalog(input.materials, param.materialCategory?.trim() || undefined).map((info) => info.name);
    const knownLower = new Set(known.map((candidate) => candidate.toLowerCase()));
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|[^\\w.])${escaped}\\.([A-Za-z_]\\w*)(?!\\w)`, "g");
    for (const match of input.formula.matchAll(pattern)) {
      const prop = match[1];
      if (knownLower.has(prop.toLowerCase()) || unknown.has(`${name}.${prop}`)) continue;
      const best = known
        .map((candidate) => ({ candidate, distance: editDistance(prop.toLowerCase(), candidate.toLowerCase()) }))
        .sort((a, b) => a.distance - b.distance)[0];
      unknown.set(`${name}.${prop}`, {
        reference: `${name}.${prop}`,
        suggestion: best && best.distance <= Math.max(2, Math.floor(prop.length / 3)) ? best.candidate : undefined,
      });
    }
  });
  return Array.from(unknown.values());
}
