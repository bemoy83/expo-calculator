import type { MaterialThemeBuilderJSON, ParsedMD3Theme, MD3ColorTokens } from './types';

/**
 * Convert hex color to RGB format for CSS variables
 * Input: "#2563EB" or "2563EB"
 * Output: "37 99 235"
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  return `${r} ${g} ${b}`;
}

/**
 * Generate surface container hierarchy if not provided
 * Uses MD3 algorithm to derive containers from base surface
 */
function generateSurfaceContainers(surface: string): {
  highest: string;
  high: string;
  container: string;
  low: string;
  lowest: string;
} {
  const [r, g, b] = surface.split(' ').map(Number);
  
  // Light mode: containers get lighter
  // Dark mode: containers get darker
  const isLight = (r + g + b) > 384; // Rough heuristic
  
  if (isLight) {
    // Light mode: containers are progressively lighter
    return {
      highest: '255 255 255',
      high: '255 255 255',
      container: '255 255 255',
      low: `${Math.min(255, r + 8)} ${Math.min(255, g + 8)} ${Math.min(255, b + 8)}`,
      lowest: surface,
    };
  } else {
    // Dark mode: containers are progressively darker
    return {
      highest: `${Math.min(255, r + 27)} ${Math.min(255, g + 27)} ${Math.min(255, b + 27)}`,
      high: `${Math.min(255, r + 20)} ${Math.min(255, g + 20)} ${Math.min(255, b + 20)}`,
      container: `${Math.min(255, r + 12)} ${Math.min(255, g + 12)} ${Math.min(255, b + 12)}`,
      low: `${Math.min(255, r + 5)} ${Math.min(255, g + 5)} ${Math.min(255, b + 5)}`,
      lowest: surface,
    };
  }
}

/**
 * Parse Material Theme Builder JSON to our MD3 format
 */
export function parseThemeBuilderJSON(
  json: MaterialThemeBuilderJSON,
  themeName: string = 'Custom Theme'
): ParsedMD3Theme {
  const parseScheme = (scheme: MaterialThemeBuilderJSON['schemes']['light']): MD3ColorTokens => {
    // Check if ALL surface containers are provided in the JSON
    // If any are missing, generate them from the base surface
    const hasAllContainers = 
      scheme.surfaceContainerHighest &&
      scheme.surfaceContainerHigh &&
      scheme.surfaceContainer &&
      scheme.surfaceContainerLow &&
      scheme.surfaceContainerLowest;
    
    // Always generate containers - use provided ones if available, otherwise generate
    const generatedContainers = generateSurfaceContainers(hexToRgb(scheme.surface));
    const containers = hasAllContainers
      ? {
          surfaceContainerHighest: hexToRgb(scheme.surfaceContainerHighest!),
          surfaceContainerHigh: hexToRgb(scheme.surfaceContainerHigh!),
          surfaceContainer: hexToRgb(scheme.surfaceContainer!),
          surfaceContainerLow: hexToRgb(scheme.surfaceContainerLow!),
          surfaceContainerLowest: hexToRgb(scheme.surfaceContainerLowest!),
        }
      : {
          surfaceContainerHighest: generatedContainers.highest,
          surfaceContainerHigh: generatedContainers.high,
          surfaceContainer: generatedContainers.container,
          surfaceContainerLow: generatedContainers.low,
          surfaceContainerLowest: generatedContainers.lowest,
        };
    
    return {
      primary: hexToRgb(scheme.primary),
      onPrimary: hexToRgb(scheme.onPrimary),
      primaryContainer: hexToRgb(scheme.primaryContainer),
      onPrimaryContainer: hexToRgb(scheme.onPrimaryContainer),
      secondary: hexToRgb(scheme.secondary),
      onSecondary: hexToRgb(scheme.onSecondary),
      secondaryContainer: hexToRgb(scheme.secondaryContainer),
      onSecondaryContainer: hexToRgb(scheme.onSecondaryContainer),
      tertiary: hexToRgb(scheme.tertiary),
      onTertiary: hexToRgb(scheme.onTertiary),
      tertiaryContainer: hexToRgb(scheme.tertiaryContainer),
      onTertiaryContainer: hexToRgb(scheme.onTertiaryContainer),
      error: hexToRgb(scheme.error),
      onError: hexToRgb(scheme.onError),
      errorContainer: hexToRgb(scheme.errorContainer),
      onErrorContainer: hexToRgb(scheme.onErrorContainer),
      surface: hexToRgb(scheme.surface),
      onSurface: hexToRgb(scheme.onSurface),
      surfaceVariant: hexToRgb(scheme.surfaceVariant),
      onSurfaceVariant: hexToRgb(scheme.onSurfaceVariant),
      outline: hexToRgb(scheme.outline),
      outlineVariant: hexToRgb(scheme.outlineVariant),
      ...containers,
    };
  };
  
  // Use seed if source is not present (newer format), fallback to default if neither exists
  const sourceColor = json.source || json.seed || '#000000';
  
  return {
    name: themeName,
    source: sourceColor,
    light: parseScheme(json.schemes.light),
    dark: parseScheme(json.schemes.dark),
  };
}

