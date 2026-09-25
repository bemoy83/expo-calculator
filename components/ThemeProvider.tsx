'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';

// Keys left behind by the removed Material theme import feature.
const LEGACY_THEME_KEYS = ['md3-custom-themes', 'md3-active-theme'];

/**
 * Light/dark mode switching (next-themes): system preference detection, persistent
 * selection, and the `dark` class on <html> for Tailwind dark mode.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  useEffect(() => {
    try {
      LEGACY_THEME_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage unavailable; nothing to clean up.
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
