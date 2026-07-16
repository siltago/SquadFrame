import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./ui/**/*.{js,ts,jsx,tsx}",
    "./modules/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Tokens principais SquadUI ── */
        bg:      "rgb(var(--color-bg)       / <alpha-value>)",
        surface: "rgb(var(--color-surface)  / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--color-surface-3) / <alpha-value>)",

        text: {
          DEFAULT: "rgb(var(--color-text)   / <alpha-value>)",
          2:       "rgb(var(--color-text-2) / <alpha-value>)",
          3:       "rgb(var(--color-text-3) / <alpha-value>)",
        },

        border:  "rgb(var(--color-border)  / <alpha-value>)",
        divider: "rgb(var(--color-divider) / <alpha-value>)",

        primary: {
          DEFAULT: "rgb(var(--color-primary)        / <alpha-value>)",
          hover:   "rgb(var(--color-primary-hover)  / <alpha-value>)",
          active:  "rgb(var(--color-primary-active) / <alpha-value>)",
          soft:    "rgb(var(--color-primary-soft)   / <alpha-value>)",
        },

        accent: {
          DEFAULT: "rgb(var(--color-accent)       / <alpha-value>)",
          hover:   "rgb(var(--color-accent-hover) / <alpha-value>)",
          soft:    "rgb(var(--color-accent-soft)  / <alpha-value>)",
        },

        success: {
          DEFAULT: "rgb(var(--color-success)      / <alpha-value>)",
          hover:   "rgb(var(--color-success-hover)/ <alpha-value>)",
          soft:    "rgb(var(--color-success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning)      / <alpha-value>)",
          hover:   "rgb(var(--color-warning-hover)/ <alpha-value>)",
          soft:    "rgb(var(--color-warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger)      / <alpha-value>)",
          hover:   "rgb(var(--color-danger-hover)/ <alpha-value>)",
          soft:    "rgb(var(--color-danger-soft) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--color-info)      / <alpha-value>)",
          soft:    "rgb(var(--color-info-soft) / <alpha-value>)",
        },

        sidebar: {
          DEFAULT: "rgb(var(--color-sidebar-bg)         / <alpha-value>)",
          surface: "rgb(var(--color-sidebar-surface)    / <alpha-value>)",
          text:    "rgb(var(--color-sidebar-text)       / <alpha-value>)",
          muted:   "rgb(var(--color-sidebar-text-muted) / <alpha-value>)",
          border:  "rgb(var(--color-sidebar-border)     / <alpha-value>)",
          active:  "rgb(var(--color-sidebar-active, var(--color-primary)) / <alpha-value>)",
        },
        topbar: "rgb(var(--color-topbar, var(--color-primary)) / <alpha-value>)",

        /* ── Aliases legados ── */
        canvas: "rgb(var(--color-bg)      / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-text)   / <alpha-value>)",
          soft:    "rgb(var(--color-text-2) / <alpha-value>)",
          faint:   "rgb(var(--color-text-3) / <alpha-value>)",
        },
        line:  "rgb(var(--color-border)       / <alpha-value>)",
        steel: {
          DEFAULT: "rgb(var(--color-primary)       / <alpha-value>)",
          hover:   "rgb(var(--color-primary-hover) / <alpha-value>)",
          soft:    "rgb(var(--color-primary-soft)  / <alpha-value>)",
        },
      },

      fontFamily: {
        sans:    ["Cairo", "system-ui", "sans-serif"],
        display: ["Cairo", "system-ui", "sans-serif"],
      },

      fontSize: {
        display:  ["2.25rem",  { lineHeight: "1.2",  fontWeight: "900" }],
        h1:       ["1.875rem", { lineHeight: "1.25", fontWeight: "700" }],
        h2:       ["1.5rem",   { lineHeight: "1.25", fontWeight: "700" }],
        h3:       ["1.25rem",  { lineHeight: "1.3",  fontWeight: "600" }],
        subtitle: ["1.125rem", { lineHeight: "1.4",  fontWeight: "600" }],
        body:     ["0.875rem", { lineHeight: "1.5",  fontWeight: "400" }],
        caption:  ["0.8125rem",{ lineHeight: "1.5",  fontWeight: "400" }],
        small:    ["0.75rem",  { lineHeight: "1.5",  fontWeight: "400" }],
      },

      borderRadius: {
        sm:   "6px",
        md:   "10px",
        lg:   "16px",
        xl:   "18px",
        full: "9999px",
        card: "16px",
      },

      boxShadow: {
        sm:   "var(--shadow-sm)",
        card: "var(--shadow-md)",
        lg:   "var(--shadow-lg)",
        xl:   "var(--shadow-xl)",
      },

      transitionDuration: {
        hover:   "120",
        click:   "80",
        sidebar: "180",
        modal:   "220",
        toast:   "200",
        page:    "180",
      },

      spacing: {
        "4.5": "1.125rem",
        "18":  "4.5rem",
        "72px":"72px",
        "260px":"260px",
      },
    },
  },
  plugins: [],
};

export default config;
