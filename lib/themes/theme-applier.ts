import type { ParsedMD3Theme } from './types';

/**
 * Default surface container values from globals.css
 * Used as fallbacks when theme is null or values are missing
 */
const DEFAULT_SURFACE_CONTAINERS_LIGHT = {
  lowest: '240 244 248',
  low: '248 250 252',
  container: '255 255 255',
  high: '255 255 255',
  highest: '255 255 255',
};

const DEFAULT_SURFACE_CONTAINERS_DARK = {
  lowest: '18 18 18',
  low: '23 23 23',
  container: '30 30 30',
  high: '38 38 38',
  highest: '45 45 45',
};

/**
 * Safely set a CSS variable with fallback
 */
function setVarSafe(root: HTMLElement, name: string, value: string | undefined, fallback: string): void {
  const finalValue = value && value.trim() !== '' ? value : fallback;
  root.style.setProperty(name, finalValue);
}

/**
 * Apply theme to document root CSS variables
 * Pass null to reset to default CSS values
 * 
 * CRITICAL: Always ensures surface container variables are set, even if missing from theme
 */
export function applyTheme(theme: ParsedMD3Theme | null, isDark: boolean): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const scheme = theme ? (isDark ? theme.dark : theme.light) : null;
  const defaultContainers = isDark ? DEFAULT_SURFACE_CONTAINERS_DARK : DEFAULT_SURFACE_CONTAINERS_LIGHT;
  
  if (scheme) {
    // Apply all MD3 tokens
    root.style.setProperty('--md-primary', scheme.primary);
    root.style.setProperty('--md-on-primary', scheme.onPrimary);
    root.style.setProperty('--md-primary-container', scheme.primaryContainer);
    root.style.setProperty('--md-on-primary-container', scheme.onPrimaryContainer);
    
    root.style.setProperty('--md-secondary', scheme.secondary);
    root.style.setProperty('--md-on-secondary', scheme.onSecondary);
    root.style.setProperty('--md-secondary-container', scheme.secondaryContainer);
    root.style.setProperty('--md-on-secondary-container', scheme.onSecondaryContainer);
    
    root.style.setProperty('--md-tertiary', scheme.tertiary);
    root.style.setProperty('--md-on-tertiary', scheme.onTertiary);
    root.style.setProperty('--md-tertiary-container', scheme.tertiaryContainer);
    root.style.setProperty('--md-on-tertiary-container', scheme.onTertiaryContainer);
    
    root.style.setProperty('--md-error', scheme.error);
    root.style.setProperty('--md-on-error', scheme.onError);
    root.style.setProperty('--md-error-container', scheme.errorContainer);
    root.style.setProperty('--md-on-error-container', scheme.onErrorContainer);
    
    root.style.setProperty('--md-surface', scheme.surface);
    root.style.setProperty('--md-on-surface', scheme.onSurface);
    root.style.setProperty('--md-surface-variant', scheme.surfaceVariant);
    root.style.setProperty('--md-on-surface-variant', scheme.onSurfaceVariant);
    
    root.style.setProperty('--md-outline', scheme.outline);
    root.style.setProperty('--md-outline-variant', scheme.outlineVariant);
    
    // CRITICAL: Always set surface container variables with safe fallbacks
    // These MUST exist for modals, dialogs, cards, and all surface-based UI
    setVarSafe(root, '--md-surface-container-lowest', scheme.surfaceContainerLowest, defaultContainers.lowest);
    setVarSafe(root, '--md-surface-container-low', scheme.surfaceContainerLow, defaultContainers.low);
    setVarSafe(root, '--md-surface-container', scheme.surfaceContainer, defaultContainers.container);
    setVarSafe(root, '--md-surface-container-high', scheme.surfaceContainerHigh, defaultContainers.high);
    setVarSafe(root, '--md-surface-container-highest', scheme.surfaceContainerHighest, defaultContainers.highest);
  } else {
    // Reset to default (remove inline styles, let CSS take over)
    // BUT: Explicitly set surface containers to ensure they exist
    // This prevents undefined variables when switching back to default theme
    const md3Props = [
      '--md-primary', '--md-on-primary', '--md-primary-container', '--md-on-primary-container',
      '--md-secondary', '--md-on-secondary', '--md-secondary-container', '--md-on-secondary-container',
      '--md-tertiary', '--md-on-tertiary', '--md-tertiary-container', '--md-on-tertiary-container',
      '--md-error', '--md-on-error', '--md-error-container', '--md-on-error-container',
      '--md-surface', '--md-on-surface', '--md-surface-variant', '--md-on-surface-variant',
      '--md-outline', '--md-outline-variant',
    ];
    
    // Remove non-container properties
    md3Props.forEach(prop => root.style.removeProperty(prop));
    
    // CRITICAL: Explicitly set surface containers to default values
    // This ensures they exist even when using default theme
    root.style.setProperty('--md-surface-container-lowest', defaultContainers.lowest);
    root.style.setProperty('--md-surface-container-low', defaultContainers.low);
    root.style.setProperty('--md-surface-container', defaultContainers.container);
    root.style.setProperty('--md-surface-container-high', defaultContainers.high);
    root.style.setProperty('--md-surface-container-highest', defaultContainers.highest);
  }
}
