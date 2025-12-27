import type { ParsedMD3Theme } from './types';

export const THEME_STORAGE_KEY = 'md3-custom-themes';
export const ACTIVE_THEME_KEY = 'md3-active-theme';
const DEFAULT_THEME_NAME = '__default__';

/**
 * Theme Manager for Material Design 3 themes
 * Ensures there's always a default theme option available
 */
export class ThemeManager {
  /**
   * Get the default theme name
   * This is a special identifier that means "use CSS defaults"
   */
  static getDefaultThemeName(): string {
    return DEFAULT_THEME_NAME;
  }
  
  /**
   * Check if a theme name is the default theme
   */
  static isDefaultTheme(themeName: string | null): boolean {
    return themeName === null || themeName === DEFAULT_THEME_NAME;
  }
  
  /**
   * Get all stored custom themes
   */
  static getStoredThemes(): ParsedMD3Theme[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Get all available themes (including default)
   */
  static getAvailableThemes(): Array<{ name: string; isDefault: boolean }> {
    const customThemes = this.getStoredThemes();
    return [
      { name: DEFAULT_THEME_NAME, isDefault: true },
      ...customThemes.map(t => ({ name: t.name, isDefault: false })),
    ];
  }
  
  /**
   * Save a theme to storage
   */
  static saveTheme(theme: ParsedMD3Theme): void {
    if (typeof window === 'undefined') return;
    
    // Prevent saving with default theme name
    if (theme.name === DEFAULT_THEME_NAME) {
      throw new Error(`Cannot save theme with reserved name "${DEFAULT_THEME_NAME}"`);
    }
    
    const themes = this.getStoredThemes();
    const existingIndex = themes.findIndex(t => t.name === theme.name);
    
    if (existingIndex >= 0) {
      themes[existingIndex] = theme;
    } else {
      themes.push(theme);
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
  }
  
  /**
   * Delete a theme
   */
  static deleteTheme(themeName: string): void {
    if (typeof window === 'undefined') return;
    
    // Cannot delete default theme
    if (themeName === DEFAULT_THEME_NAME) {
      throw new Error('Cannot delete default theme');
    }
    
    const themes = this.getStoredThemes().filter(t => t.name !== themeName);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themes));
    
    // If deleted theme was active, reset to default
    if (this.getActiveThemeName() === themeName) {
      this.setActiveTheme(null);
    }
  }
  
  /**
   * Get active theme name (returns null for default)
   */
  static getActiveThemeName(): string | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(ACTIVE_THEME_KEY);
    // If stored value is default theme name, return null
    return stored === DEFAULT_THEME_NAME ? null : stored;
  }
  
  /**
   * Set active theme (pass null for default)
   */
  static setActiveTheme(themeName: string | null): void {
    if (typeof window === 'undefined') return;
    
    if (themeName === null || themeName === DEFAULT_THEME_NAME) {
      localStorage.setItem(ACTIVE_THEME_KEY, DEFAULT_THEME_NAME);
    } else {
      localStorage.setItem(ACTIVE_THEME_KEY, themeName);
    }
  }
  
  /**
   * Get active theme (returns null for default)
   */
  static getActiveTheme(): ParsedMD3Theme | null {
    const themeName = this.getActiveThemeName();
    if (!themeName || themeName === DEFAULT_THEME_NAME) return null;
    
    const themes = this.getStoredThemes();
    return themes.find(t => t.name === themeName) || null;
  }
  
  /**
   * Get theme by name
   */
  static getTheme(themeName: string): ParsedMD3Theme | null {
    if (themeName === DEFAULT_THEME_NAME) return null;
    
    const themes = this.getStoredThemes();
    return themes.find(t => t.name === themeName) || null;
  }
}

