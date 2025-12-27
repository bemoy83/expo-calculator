/**
 * Material Theme Builder JSON format
 * Based on the official Material Theme Builder export structure
 * Supports both older format (source) and newer format (seed)
 */
export interface MaterialThemeBuilderJSON {
  source?: string; // Seed color in hex format (e.g., "#2563EB") - older format
  seed?: string; // Seed color in hex format (e.g., "#2563EB") - newer format
  schemes: {
    light: MaterialColorScheme;
    dark: MaterialColorScheme;
  };
  customColors?: Array<{
    value: string; // Hex color
    name: string;
  }>;
}

export interface MaterialColorScheme {
  primary: string; // Hex color
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  surfaceContainerHighest?: string;
  surfaceContainerHigh?: string;
  surfaceContainer?: string;
  surfaceContainerLow?: string;
  surfaceContainerLowest?: string;
}

export interface ParsedMD3Theme {
  name: string;
  source: string;
  light: MD3ColorTokens;
  dark: MD3ColorTokens;
}

export interface MD3ColorTokens {
  primary: string; // RGB format: "37 99 235"
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  // Surface containers (with defaults if not provided)
  surfaceContainerHighest: string;
  surfaceContainerHigh: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
}

