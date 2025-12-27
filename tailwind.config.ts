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
        border: "rgb(var(--md-outline) / <alpha-value>)",
        
        /* Custom tokens (not in MD3 spec) */
        warning: "rgb(var(--warning) / <alpha-value>)",
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          foreground: "rgb(var(--success-foreground) / <alpha-value>)",
        },
        disabled: "rgb(var(--disabled) / <alpha-value>)",
        separator: "rgb(var(--separator) / <alpha-value>)",
        focus: "rgb(var(--focus) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        input: {
          bg: "rgb(var(--input-bg) / <alpha-value>)",
        },
        panel: "rgb(var(--panel) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
      },
      borderColor: {
        DEFAULT: "rgb(var(--md-outline) / <alpha-value>)",
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

