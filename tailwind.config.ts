import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#f4f4f5",
        surface: "#121215",
        card: {
          DEFAULT: "#18181b",
          foreground: "#f4f4f5",
        },
        popover: {
          DEFAULT: "#18181b",
          foreground: "#f4f4f5",
        },
        primary: {
          DEFAULT: "#10b981",
          foreground: "#000000",
          hover: "#059669",
        },
        secondary: {
          DEFAULT: "#27272a",
          foreground: "#f4f4f5",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#27272a",
          foreground: "#f4f4f5",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "rgba(255, 255, 255, 0.08)",
        ring: "#10b981",
        // Status indicator tokens for court slots
        status: {
          available: "#10b981",
          holding: "#f59e0b",
          booked: "#71717a",
          cancelled: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "var(--font-inter)", "sans-serif"],
        display: ["var(--font-alexandria)", "sans-serif"],
        latin: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
