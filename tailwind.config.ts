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

        /* Status and scrim tokens (app/globals.css) */
        warning: "rgb(var(--warning) / <alpha-value>)",
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        overlay: "rgb(var(--overlay) / <alpha-value>)",
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
        'none': '0px',
        'xs': '4px',
        'sm': 'var(--radius-sm)', // 6px
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': 'var(--radius-2xl)', // 20px
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
export default config;

