import type { Material } from '../types';

/** Where a material goes when the user isn't sure of a category; filterable as a clean-up list. */
export const UNCATEGORISED = 'Uncategorised';

export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

// "Sheets", " sheets " and "SHEETS" are one category.
const key = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
// "sheet" and "sheets" too, for comparing names with categories.
const looseKey = (text: string) => key(text).replace(/s$/, '');

/** The categories in use, each once, alphabetical, with the catch-all last. */
export function getMaterialCategories(materials: Pick<Material, 'category'>[]): string[] {
  const found = new Map<string, string>();
  materials.forEach((material) => {
    const name = material.category?.trim().replace(/\s+/g, ' ');
    if (name && !found.has(key(name))) found.set(key(name), name);
  });
  return Array.from(found.values()).sort((a, b) =>
    a === UNCATEGORISED ? 1 : b === UNCATEGORISED ? -1 : a.localeCompare(b)
  );
}

/**
 * What to save for the category the user typed. Empty becomes Uncategorised; a spelling that
 * differs from an existing category only by case or spacing takes the existing one. A
 * near miss ("Sheet", "Shets") is saved as typed and returned as `didYouMean`, a nudge only.
 */
export function resolveMaterialCategory(
  typed: string,
  existing: string[]
): { value: string; didYouMean?: string } {
  const cleaned = typed.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { value: UNCATEGORISED };
  const exact = existing.find((category) => key(category) === key(cleaned));
  if (exact) return { value: exact };
  const near = existing.find(
    (category) =>
      category !== UNCATEGORISED &&
      (looseKey(category) === looseKey(cleaned) ||
        editDistance(key(category), key(cleaned)) <= (cleaned.length > 5 ? 2 : 1))
  );
  return { value: cleaned, didYouMean: near };
}

/** The category a parameter name points at (`sheet`, `sheets` → "Sheets"), if one does. */
export function categoryForName(name: string, categories: string[]): string | undefined {
  const wanted = looseKey(name);
  return wanted ? categories.find((category) => looseKey(category) === wanted) : undefined;
}

export function sameCategory(a: string | undefined, b: string | undefined): boolean {
  return key(a ?? '') === key(b ?? '');
}
