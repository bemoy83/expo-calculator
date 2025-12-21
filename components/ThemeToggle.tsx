'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * Theme Toggle Component
 * 
 * Allows users to switch between light and dark themes.
 * Uses next-themes for theme management and handles hydration properly.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <button
        className="p-2.5 rounded-full border border-border bg-muted/30 text-muted-foreground transition-smooth shadow-soft"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  // Determine if we're in dark mode
  // Use resolvedTheme if available (handles 'system' theme), otherwise fall back to theme
  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  const toggleTheme = () => {
    // Toggle between light and dark (ignore system preference when user clicks)
    // Force explicit theme selection
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full border border-border bg-muted/30 hover:bg-accent hover:border-accent hover:text-accent-foreground text-muted-foreground transition-smooth shadow-soft hover:shadow-elevated active:scale-95"
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

