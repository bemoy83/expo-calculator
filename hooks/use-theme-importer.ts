import { useState, useEffect } from 'react';
import { parseThemeBuilderJSON } from '@/lib/themes/theme-parser';
import { ThemeManager } from '@/lib/themes/theme-manager';
import { applyTheme } from '@/lib/themes/theme-applier';
import { useTheme } from 'next-themes';
import type { MaterialThemeBuilderJSON, ParsedMD3Theme } from '@/lib/themes/types';

export function useThemeImporter() {
  const [error, setError] = useState<string | null>(null);
  const [storedThemes, setStoredThemes] = useState<ParsedMD3Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<ParsedMD3Theme | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // Load themes on mount
  useEffect(() => {
    setStoredThemes(ThemeManager.getStoredThemes());
    setActiveTheme(ThemeManager.getActiveTheme());
  }, []);
  
  const importTheme = async (
    json: MaterialThemeBuilderJSON,
    themeName: string
  ): Promise<ParsedMD3Theme | null> => {
    try {
      setError(null);
      
      // Validate JSON structure - check for both source and seed (supporting both formats)
      if ((!json.source && !json.seed) || !json.schemes?.light || !json.schemes?.dark) {
        throw new Error('Invalid Material Theme Builder JSON format. Missing required fields: seed/source, schemes.light, or schemes.dark');
      }
      
      // Validate theme name
      if (!themeName || themeName.trim() === '') {
        throw new Error('Theme name is required');
      }
      
      // Prevent using default theme name
      if (themeName === ThemeManager.getDefaultThemeName()) {
        throw new Error(`Theme name cannot be "${ThemeManager.getDefaultThemeName()}"`);
      }
      
      // Parse theme
      const parsedTheme = parseThemeBuilderJSON(json, themeName.trim());
      
      // Save theme
      ThemeManager.saveTheme(parsedTheme);
      
      // Update state
      setStoredThemes(ThemeManager.getStoredThemes());
      
      // Apply immediately if no theme is active, or if this is the active theme
      const currentActive = ThemeManager.getActiveTheme();
      if (!currentActive || currentActive.name === parsedTheme.name) {
        ThemeManager.setActiveTheme(parsedTheme.name);
        setActiveTheme(parsedTheme);
        applyTheme(parsedTheme, isDark);
      }
      
      return parsedTheme;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import theme';
      setError(message);
      return null;
    }
  };
  
  const loadTheme = (themeName: string | null): void => {
    try {
      setError(null);
      
      if (themeName === null || themeName === ThemeManager.getDefaultThemeName()) {
        // Load default theme (reset to CSS defaults)
        ThemeManager.setActiveTheme(null);
        setActiveTheme(null);
        applyTheme(null, isDark);
      } else {
        const theme = ThemeManager.getTheme(themeName);
        if (theme) {
          ThemeManager.setActiveTheme(themeName);
          setActiveTheme(theme);
          applyTheme(theme, isDark);
        } else {
          throw new Error(`Theme "${themeName}" not found`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load theme';
      setError(message);
    }
  };
  
  const removeTheme = (themeName: string): void => {
    try {
      setError(null);
      
      // Cannot remove default theme
      if (themeName === ThemeManager.getDefaultThemeName()) {
        throw new Error('Cannot remove default theme');
      }
      
      const wasActive = activeTheme?.name === themeName;
      
      ThemeManager.deleteTheme(themeName);
      
      // Update state
      setStoredThemes(ThemeManager.getStoredThemes());
      
      // If removed theme was active, reset to default
      if (wasActive) {
        setActiveTheme(null);
        applyTheme(null, isDark);
      } else if (activeTheme?.name === themeName) {
        setActiveTheme(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove theme';
      setError(message);
    }
  };
  
  return {
    importTheme,
    loadTheme,
    removeTheme,
    error,
    storedThemes,
    activeTheme,
    defaultThemeName: ThemeManager.getDefaultThemeName(),
    isDefaultTheme: ThemeManager.isDefaultTheme(activeTheme?.name || null),
  };
}

