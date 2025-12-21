'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

/**
 * Theme Provider wrapper for next-themes
 * 
 * Enables light/dark theme switching with:
 * - System preference detection
 * - Persistent theme selection
 * - Automatic dark class on <html> element for Tailwind dark mode
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

