import { browseHref } from '@/components/shared/Breadcrumb';

/** The builder was opened from the calculators list, filtered to `category` ('' for all). */
export interface FromList {
  category: string;
}

/**
 * The builder's address: a calculator (or a new one, without `id`). Opened from the list, it
 * says so (`from=list`, with the list's category), so Close goes back to the list rather than
 * to the calculator; the builder's other way in is the calculator's own Edit.
 */
export function builderHref(id?: string, fromList?: FromList, view?: 'layout'): string {
  const query = new URLSearchParams();
  if (id) query.set('id', id);
  if (fromList) {
    query.set('from', 'list');
    if (fromList.category) query.set('category', fromList.category);
  }
  // Back from the preview lands on the Layout tab it was opened from.
  if (view) query.set('view', view);
  const text = query.toString();
  return text ? `/calculator/edit?${text}` : '/calculator/edit';
}

/** Where the builder's Close goes: the list it was opened from, else the calculator (or the list, for a new one). */
export function builderCloseHref(id: string, isSaved: boolean, fromList?: FromList): string {
  if (fromList) return browseHref('/', { category: fromList.category, id: isSaved ? id : undefined });
  return isSaved ? `/calculator?id=${encodeURIComponent(id)}` : '/';
}
