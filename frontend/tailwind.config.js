/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── DIGBA Design System (mirrored from landing page) ──────────────
        primary: {
          DEFAULT: "hsl(152 45% 22%)",
          foreground: "hsl(40 30% 97%)",
        },
        secondary: {
          DEFAULT: "hsl(38 70% 55%)",
          foreground: "hsl(150 30% 10%)",
        },
        "section-dark": {
          DEFAULT: "hsl(152 30% 8%)",
          foreground: "hsl(40 20% 90%)",
        },
        background: "hsl(40 30% 97%)",
        foreground: "hsl(150 30% 10%)",
        card: {
          DEFAULT: "hsl(40 25% 98%)",
          foreground: "hsl(150 30% 10%)",
        },
        border: "hsl(40 15% 88%)",
        muted: {
          DEFAULT: "hsl(40 20% 92%)",
          foreground: "hsl(150 10% 45%)",
        },
        // ── Semantic risk levels (kept unchanged) ─────────────────────────
        digba: {
          green:  '#16a34a',
          yellow: '#ca8a04',
          red:    '#dc2626',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"',      'system-ui', 'sans-serif'],
        sans:    ['"DM Sans"',      'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  safelist: [
    "bg-background", "text-foreground", "font-display",
    "bg-primary", "text-primary-foreground",
    "bg-secondary", "text-secondary-foreground",
    "border-border", "text-muted-foreground",
  ],
  plugins: [],
}
