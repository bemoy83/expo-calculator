import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* MD3 Color Roles - Material Design 3 Compliant */
        md: {
          primary: "rgb(var(--md-primary) / <alpha-value>)",
          'on-primary': "rgb(var(--md-on-primary) / <alpha-value>)",
          'primary-container': "rgb(var(--md-primary-container) / <alpha-value>)",
          'on-primary-container': "rgb(var(--md-on-primary-container) / <alpha-value>)",
          secondary: "rgb(var(--md-secondary) / <alpha-value>)",
          'on-secondary': "rgb(var(--md-on-secondary) / <alpha-value>)",
          'secondary-container': "rgb(var(--md-secondary-container) / <alpha-value>)",
          'on-secondary-container': "rgb(var(--md-on-secondary-container) / <alpha-value>)",
          tertiary: "rgb(var(--md-tertiary) / <alpha-value>)",
          'on-tertiary': "rgb(var(--md-on-tertiary) / <alpha-value>)",
          'tertiary-container': "rgb(var(--md-tertiary-container) / <alpha-value>)",
          'on-tertiary-container': "rgb(var(--md-on-tertiary-container) / <alpha-value>)",
          error: "rgb(var(--md-error) / <alpha-value>)",
          'on-error': "rgb(var(--md-on-error) / <alpha-value>)",
          'error-container': "rgb(var(--md-error-container) / <alpha-value>)",
          'on-error-container': "rgb(var(--md-on-error-container) / <alpha-value>)",
          surface: "rgb(var(--md-surface) / <alpha-value>)",
          'on-surface': "rgb(var(--md-on-surface) / <alpha-value>)",
          'surface-variant': "rgb(var(--md-surface-variant) / <alpha-value>)",
          'on-surface-variant': "rgb(var(--md-on-surface-variant) / <alpha-value>)",
          'surface-container-lowest': "rgb(var(--md-surface-container-lowest) / <alpha-value>)",
          'surface-container-low': "rgb(var(--md-surface-container-low) / <alpha-value>)",
          'surface-container': "rgb(var(--md-surface-container) / <alpha-value>)",
          'surface-container-high': "rgb(var(--md-surface-container-high) / <alpha-value>)",
          'surface-container-highest': "rgb(var(--md-surface-container-highest) / <alpha-value>)",
          outline: "rgb(var(--md-outline) / <alpha-value>)",
          'outline-variant': "rgb(var(--md-outline-variant) / <alpha-value>)",
        },
        
        /* Convenience aliases for common MD3 patterns */
        background: "rgb(var(--md-surface) / <alpha-value>)",
        foreground: "rgb(var(--md-on-surface) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--md-surface-container) / <alpha-value>)",
          foreground: "rgb(var(--md-on-surface) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--md-surface-variant) / <alpha-value>)",
          foreground: "rgb(var(--md-on-surface-variant) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--md-primary) / <alpha-value>)",
          muted: "rgb(var(--md-primary-container) / <alpha-value>)",
          foreground: "rgb(var(--md-on-primary) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--md-error) / <alpha-value>)",
          foreground: "rgb(var(--md-on-error) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        
        /* Design tokens (Ink palette, app/globals.css). Derived ones are full colors, so they
           take no /opacity modifier. */
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          hover: "var(--surface-hover)",
        },
        sunken: {
          DEFAULT: "rgb(var(--sunken) / <alpha-value>)",
          2: "var(--sunken-2)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
          body: "var(--ink-body)",
          subtle: "var(--ink-subtle)",
        },
        'on-accent': "rgb(var(--on-accent) / <alpha-value>)",
        action: {
          DEFAULT: "rgb(var(--action) / <alpha-value>)",
          solid: "rgb(var(--action-solid) / <alpha-value>)",
          bg: "rgb(var(--action-bg) / <alpha-value>)",
          border: "rgb(var(--action-border) / <alpha-value>)",
        },
        committed: {
          DEFAULT: "rgb(var(--committed) / <alpha-value>)",
          solid: "var(--committed-solid)",
          bg: "rgb(var(--committed-bg) / <alpha-value>)",
          border: "rgb(var(--committed-border) / <alpha-value>)",
        },
        draft: {
          DEFAULT: "rgb(var(--draft) / <alpha-value>)",
          bg: "rgb(var(--draft-bg) / <alpha-value>)",
          border: "rgb(var(--draft-border) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          bg: "rgb(var(--danger-bg) / <alpha-value>)",
          border: "rgb(var(--danger-border) / <alpha-value>)",
        },

        /* Custom tokens (not in MD3 spec) */
        warning: "rgb(var(--warning) / <alpha-value>)",
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        input: {
          bg: "rgb(var(--md-surface-container-low) / <alpha-value>)",
        },
      },
      borderColor: {
        DEFAULT: "rgb(var(--border) / <alpha-value>)",
      },
      fontFamily: {
        // Archivo and IBM Plex Mono, loaded in app/layout.tsx. Body text is Archivo
        // (globals.css); numbers should use the .font-numeric utility (mono + tabular-nums).
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-numeric)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        panel: 'var(--shadow-panel)',
      },
      spacing: {
        sidebar: 'var(--app-sidebar-w)',
        'app-header': 'var(--app-header-h)',
      },
      inset: {
        'sticky-offset': 'calc(var(--app-header-h) + 1.5rem)',
      },
      borderRadius: {
        'none': 'var(--md-shape-corner-none)',
        'xs': 'var(--md-shape-corner-extra-small)',
        'sm': 'var(--radius-sm)', // Custom size (6px) - between extra-small and small
        'md': 'var(--md-shape-corner-small)',
        'lg': 'var(--md-shape-corner-medium)',
        'xl': 'var(--md-shape-corner-large)',
        '2xl': 'var(--radius-2xl)', // Custom size (20px) - between large and extra-large
        'extra-large': 'var(--md-shape-corner-extra-large)', // MD3 extra-large (28px)
        'full': 'var(--md-shape-corner-full)',
      },
    },
  },
  plugins: [],
};
export default config;

