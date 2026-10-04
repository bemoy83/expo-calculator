import type { LineHue } from './types';

export const LINE_HUES: LineHue[] = ['blue', 'teal', 'green', 'amber', 'rose', 'violet'];

/** The CSS colour of a hue, following the theme; undefined when the calculator has none. */
export const lineColorVar = (hue?: LineHue) => (hue && LINE_HUES.includes(hue) ? `var(--line-${hue})` : undefined);
