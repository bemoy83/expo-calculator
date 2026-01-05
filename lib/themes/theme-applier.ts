import type { ParsedMD3Theme } from './types';

/**
 * Apply theme to document root CSS variables
 * Pass null to reset to default CSS values
 */
export function applyTheme(theme: ParsedMD3Theme | null, isDark: boolean): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const scheme = theme ? (isDark ? theme.dark : theme.light) : null;
  
  if (scheme) {
    // Apply all MD3 tokens from imported theme
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
    
    // Set surface container variables from theme
    root.style.setProperty('--md-surface-container-lowest', scheme.surfaceContainerLowest);
    root.style.setProperty('--md-surface-container-low', scheme.surfaceContainerLow);
    root.style.setProperty('--md-surface-container', scheme.surfaceContainer);
    root.style.setProperty('--md-surface-container-high', scheme.surfaceContainerHigh);
    root.style.setProperty('--md-surface-container-highest', scheme.surfaceContainerHighest);
  } else {
    // Reset to default - remove ALL inline styles and let globals.css take over
    const md3Props = [
      '--md-primary', '--md-on-primary', '--md-primary-container', '--md-on-primary-container',
      '--md-secondary', '--md-on-secondary', '--md-secondary-container', '--md-on-secondary-container',
      '--md-tertiary', '--md-on-tertiary', '--md-tertiary-container', '--md-on-tertiary-container',
      '--md-error', '--md-on-error', '--md-error-container', '--md-on-error-container',
      '--md-surface', '--md-on-surface', '--md-surface-variant', '--md-on-surface-variant',
      '--md-outline', '--md-outline-variant',
      '--md-surface-container-lowest', '--md-surface-container-low', '--md-surface-container',
      '--md-surface-container-high', '--md-surface-container-highest',
    ];
    
    // Remove all properties - let CSS handle defaults via --md-sys-color-* mapping
    md3Props.forEach(prop => root.style.removeProperty(prop));
  }
}
