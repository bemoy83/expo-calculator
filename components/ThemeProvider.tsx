'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ThemeManager, ACTIVE_THEME_KEY, THEME_STORAGE_KEY } from '@/lib/themes/theme-manager';
import { applyTheme } from '@/lib/themes/theme-applier';
import type { ComponentProps } from 'react';

/**
 * Enhanced Theme Provider that supports Material Theme Builder imports
 * 
 * Enables light/dark theme switching with:
 * - System preference detection
 * - Persistent theme selection
 * - Automatic dark class on <html> element for Tailwind dark mode
 * - Custom Material Theme Builder JSON import support
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Sync custom themes with theme system
 * Applies active custom theme or resets to default CSS values
 */
function ThemeSync() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  useEffect(() => {
    const activeTheme = ThemeManager.getActiveTheme();
    applyTheme(activeTheme, isDark);
  }, [isDark]);
  
  // Listen for storage changes to update theme when changed in another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_THEME_KEY || e.key === THEME_STORAGE_KEY) {
        const activeTheme = ThemeManager.getActiveTheme();
        applyTheme(activeTheme, isDark);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isDark]);
  
  return null;
}

