/**
 * Grid Layout Configuration
 * Defines card types, constraints, and default layouts for the module editor
 */

export interface CardConfig {
  id: string;
  title: string;
  minW: number;  // Minimum grid width units
  minH: number;  // Minimum grid height units
  defaultW: number;
  defaultH: number;
  maxW?: number;
  maxH?: number;
  resizable: boolean;
  draggable: boolean;
  category: 'tools' | 'formula' | 'validation' | 'operators' | 'fields';
}

export const CARD_CONFIGS: Record<string, CardConfig> = {
  tools: {
    id: 'tools',
    title: 'Tools',
    minW: 2,  // Minimum width to ensure content is readable
    minH: 1, // Minimum 1 grid unit for dynamic sizing
    defaultW: 4,
    defaultH: 2, // Reduced default height - will be auto-sized by dynamicHeight
    maxW: 6,
    resizable: true,
    draggable: true,
    category: 'tools'
  },
  formula: {
    id: 'formula',
    title: 'Formula',
    minW: 6,
    minH: 2, // Reduced minimum height for dynamic sizing
    defaultW: 8,
    defaultH: 2, // Reduced default height - will be auto-sized by dynamicHeight
    maxW: 12,
    resizable: true,
    draggable: true,
    category: 'formula'
  },
  operators: {
    id: 'operators',
    title: 'Operators',
    minW: 3,
    minH: 1, // Minimum 1 grid unit for dynamic sizing
    defaultW: 4,
    defaultH: 2, // Reduced default height - will be auto-sized by dynamicHeight
    maxW: 6,
    resizable: true,
    draggable: true,
    category: 'operators'
  },
  validation: {
    id: 'validation',
    title: 'Validation & Debug',
    minW: 3,
    minH: 1, // Minimum 1 grid unit for dynamic sizing
    defaultW: 4,
    defaultH: 2, // Reduced default height - will be auto-sized by dynamicHeight
    maxW: 6,
    resizable: true,
    draggable: true,
    category: 'validation'
  },
  fields: {
    id: 'fields',
    title: 'Input Fields',
    minW: 6,
    minH: 6,
    defaultW: 12,
    defaultH: 8,
    resizable: true,
    draggable: true,
    category: 'fields'
  },
};

export type LayoutItem = {
  i: string;  // Card ID
  x: number;  // Grid X position
  y: number;  // Grid Y position
  w: number;  // Width in grid units
  h: number;  // Height in grid units
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
};

export type ResponsiveLayout = {
  lg?: LayoutItem[];
  md?: LayoutItem[];
  sm?: LayoutItem[];
  xs?: LayoutItem[];
  xxs?: LayoutItem[];
};

/**
 * Default layout configuration for each breakpoint
 * Uses 12-column grid system
 */
export const DEFAULT_LAYOUTS: ResponsiveLayout = {
  lg: [
    { i: 'tools', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1, maxW: 6 },
    { i: 'formula', x: 4, y: 0, w: 8, h: 2, minW: 6, minH: 1, maxW: 12 },
    { i: 'operators', x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 1, maxW: 6 },
    { i: 'validation', x: 8, y: 4, w: 4, h: 2, minW: 3, minH: 1, maxW: 6 },
  ],
  md: [
    { i: 'tools', x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 1, maxW: 6 },
    { i: 'formula', x: 5, y: 0, w: 5, h: 2, minW: 5, minH: 1, maxW: 10 },
    { i: 'operators', x: 0, y: 8, w: 5, h: 2, minW: 3, minH: 1, maxW: 6 },
    { i: 'validation', x: 5, y: 4, w: 5, h: 2, minW: 3, minH: 1, maxW: 6 },
  ],
  sm: [
    { i: 'tools', x: 0, y: 0, w: 3, h: 2, minW: 3, minH: 1 },
    { i: 'formula', x: 3, y: 0, w: 3, h: 2, minW: 3, minH: 1 },
    { i: 'operators', x: 0, y: 8, w: 3, h: 2, minW: 3, minH: 1 },
    { i: 'validation', x: 3, y: 4, w: 3, h: 2, minW: 3, minH: 1 },
  ],
  xs: [
    { i: 'tools', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 1 },
    { i: 'formula', x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 1 },
    { i: 'operators', x: 0, y: 8, w: 2, h: 2, minW: 2, minH: 1 },
    { i: 'validation', x: 2, y: 4, w: 2, h: 2, minW: 2, minH: 1 },
  ],
  xxs: [
    { i: 'tools', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'formula', x: 0, y: 8, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'operators', x: 0, y: 12, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'validation', x: 0, y: 18, w: 1, h: 2, minW: 1, minH: 1 },
  ],
};

/**
 * Breakpoints matching Tailwind defaults
 */
export const BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};

/**
 * Column counts per breakpoint
 */
export const COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2,
};

/**
 * Row height in pixels
 */
export const ROW_HEIGHT = 60;

/**
 * Get layout storage key for a module
 */
export function getLayoutStorageKey(moduleId: string, breakpoint: string): string {
  return `module-grid-layout-${moduleId}-${breakpoint}`;
}

/**
 * Get all layout storage keys for a module
 */
export function getAllLayoutStorageKeys(moduleId: string): string[] {
  return Object.keys(BREAKPOINTS).map(bp => getLayoutStorageKey(moduleId, bp));
}

