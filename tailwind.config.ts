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
        
        /* Design tokens (Ledger palette, app/globals.css). Derived ones are full colors, so they
           take no /opacity modifier. */
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
          soft: "var(--accent-soft)",
        },
        inverse: {
          DEFAULT: "rgb(var(--inverse) / <alpha-value>)",
          ink: "rgb(var(--on-inverse) / <alpha-value>)",
        },
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
        // Formula names by kind (see FormulaText).
        token: {
          input: "rgb(var(--token-input) / <alpha-value>)",
          result: "rgb(var(--token-result) / <alpha-value>)",
          function: "rgb(var(--token-function) / <alpha-value>)",
          property: "rgb(var(--token-property) / <alpha-value>)",
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
        // Schibsted Grotesk and JetBrains Mono, loaded in app/layout.tsx. Body text is Schibsted Grotesk
        // (globals.css); numbers should use the .font-numeric utility (mono + tabular-nums).
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-numeric)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        panel: 'var(--shadow-panel)',
        focus: 'var(--focus-ring)',
      },
      spacing: {
        'app-header': 'var(--app-header-h)',
      },
      width: {
        rail: 'var(--rail-w)',
        panel: 'var(--panel-w)',
        quickview: 'var(--quickview-w)',
        category: 'var(--category-w)',
      },
      inset: {
        'sticky-offset': 'calc(var(--app-header-h) + 1.5rem)',
      },
      borderRadius: {
        'none': '0px',
        'xs': '4px',
        'sm': 'var(--radius-sm)', // 6px
        'md': '8px',
        'row': 'var(--radius-row)', // 10px: list rows, cards, CTA buttons
        'lg': '12px',
        'xl': '16px',
        'inverse': 'var(--radius-inverse)', // 14px: inverted commit block
        '2xl': 'var(--radius-2xl)', // 20px
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
export default config;

