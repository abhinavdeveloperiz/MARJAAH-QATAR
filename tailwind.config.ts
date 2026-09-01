import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Semantic Theme Tokens (CSS-variable backed) ──────────────────
        // These automatically flip between dark/light via CSS vars in globals.css
        base: "var(--bg-base)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          2: "var(--bg-surface-2)",
          3: "var(--bg-surface-3)",
        },
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "border-default": "var(--border-color)",

        // ─── Deep Midnight Slate Navy matching the M.SHOP dark aesthetic ──
        navy: {
          DEFAULT: "#070B14",
          50: "#1A2540",
          100: "#151F36",
          200: "#10182C",
          300: "#0C1222",
          400: "#090E1B",
          500: "#070B14",
        },
        // ─── Royal Tech Blue extracted directly from M.SHOP logo ──────────
        primary: {
          DEFAULT: "#4063B2",
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#8D9CF5",
          500: "#4063B2",
          600: "#36529A",
          700: "#2C427F",
          800: "#223363",
          900: "#182447",
        },
        // ─── Electric Periwinkle Blue-Violet from M.SHOP logo icon gradient
        accent: {
          DEFAULT: "#8D9CF5",
          light: "#A8B4F8",
          dark: "#6F80EB",
          500: "#8D9CF5",
          400: "#A8B4F8",
        },
        // ─── Lavender / Lilac Violet from M.SHOP logo icon gradient ───────
        violet: {
          DEFAULT: "#BB9AED",
          light: "#CEB7F2",
          dark: "#9E76E4",
        },
        // ─── Modern Dark Tech Surface Layers (kept for backward compat) ───
        dark: {
          DEFAULT: "#070B14",
          50: "#131C32",
          100: "#0F172A",
          200: "#0B1120",
          300: "#070B14",
        },
        // ─── Slate neutrals ───────────────────────────────────────────────
        muted: "var(--text-secondary)",
        taupe: "#94A3B8",
        sage: "#8D9CF5",
        cyan: {
          DEFAULT: "#8D9CF5",
          soft: "#A8B4F8",
          dark: "#4063B2",
        },
        "soft-blue": "#BB9AED",
        charcoal: "#1E293B",
        "light-gray": "#F8FAFC",
        success: "#10B981",
        error: "#EF4444",
        qar: "#8D9CF5",
      },
      fontFamily: {
        guminert: ["var(--font-guminert)", "'Space Grotesk'", "Outfit", "Urbanist", "sans-serif"],
        tall: ["var(--font-guminert)", "'Space Grotesk'", "Outfit", "sans-serif"],
        display: ["var(--font-guminert)", "'Space Grotesk'", "Outfit", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "Outfit", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        outfit: ["var(--font-outfit)", "Outfit", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        "18vw": ["18vw", { lineHeight: "0.85" }],
      },
      transitionTimingFunction: {
        fluid: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      boxShadow: {
        "glow-primary": "0 0 25px rgba(64, 99, 178, 0.35)",
        "glow-accent": "0 0 25px rgba(141, 156, 245, 0.4)",
        "view-btn": "0 8px 30px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
