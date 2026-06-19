import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas:  "rgb(var(--color-canvas)  / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink)       / <alpha-value>)",
          soft:    "rgb(var(--color-ink-soft)  / <alpha-value>)",
          faint:   "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        steel: {
          DEFAULT: "rgb(var(--color-steel)       / <alpha-value>)",
          hover:   "rgb(var(--color-steel-hover) / <alpha-value>)",
          soft:    "rgb(var(--color-steel-soft)  / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
