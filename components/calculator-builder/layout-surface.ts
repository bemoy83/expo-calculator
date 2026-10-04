import { useEffect, useState } from 'react';

/** What the layout preview draws the calculator as: the quote line editor, the run page or the quick view. */
export type Surface = 'quote' | 'run' | 'quick';

export const SURFACES: Array<{ value: Surface; label: string; note: string }> = [
  { value: 'quote', label: 'Quote line', note: 'Arrange here · Run page and Quick view follow this layout' },
  { value: 'run', label: 'Run page', note: 'Same layout, reflowed · scaled to fit · arrange in Quote line' },
  { value: 'quick', label: 'Quick view', note: 'Same layout, reflowed · ⅓ widens to ½ · arrange in Quote line' },
];

const SURFACE_KEY = 'layout-preview-surface';

// The surface chosen last, per browser; Quote line until then (and wherever storage is blocked).
export function useSurface(): [Surface, (surface: Surface) => void] {
  const [surface, setSurface] = useState<Surface>('quote');
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SURFACE_KEY);
      if (SURFACES.some((candidate) => candidate.value === stored)) setSurface(stored as Surface);
    } catch {
      // Storage blocked: the default stands.
    }
  }, []);
  return [
    surface,
    (next) => {
      setSurface(next);
      try {
        window.localStorage.setItem(SURFACE_KEY, next);
      } catch {
        // Not remembered, still shown.
      }
    },
  ];
}
