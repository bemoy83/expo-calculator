'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Theme Provider wrapper for next-themes
 * 
 * Enables light/dark theme switching with:
 * - System preference detection
 * - Persistent theme selection
 * - Automatic dark class on <html> element for Tailwind dark mode
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

