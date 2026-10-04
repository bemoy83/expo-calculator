export const LINE_HUES = ['blue', 'teal', 'green', 'amber', 'rose', 'violet'] as const;

/** The hue a calculator's quote lines are coloured with; resolved to a CSS colour by `lineColorVar`. */
export type LineHue = (typeof LINE_HUES)[number];

/** The CSS colour of a hue, following the theme; undefined when the calculator has none. */
export const lineColorVar = (hue?: LineHue) => (hue ? `var(--line-${hue})` : undefined);
