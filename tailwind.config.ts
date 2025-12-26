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
        /* Semantic Base Layer Tokens */
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
        },
        panel: {
          DEFAULT: "rgb(var(--panel) / <alpha-value>)",
          muted: "rgb(var(--panel-muted) / <alpha-value>)",
        },
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        
        /* Legacy tokens (maintain backward compatibility) */
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        label: {
          foreground: "rgb(var(--label-foreground) / <alpha-value>)",
        },
        input: {
          bg: "rgb(var(--input-bg) / <alpha-value>)",
        },
        
        /* Semantic Interaction / State Tokens */
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          muted: "rgb(var(--accent-muted) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        separator: "rgb(var(--separator) / <alpha-value>)",
        focus: "rgb(var(--focus) / <alpha-value>)",
        disabled: "rgb(var(--disabled) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        
        /* Semantic Typography Tokens */
        text: {
          DEFAULT: "rgb(var(--text) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          inverted: "rgb(var(--text-inverted) / <alpha-value>)",
        },
        
        /* MD3 Color Roles - Material Theme Builder Compatible */
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
      },
      borderColor: {
        DEFAULT: "rgb(var(--border) / <alpha-value>)",
      },
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },
    },
  },
  plugins: [],
};
export default config;

