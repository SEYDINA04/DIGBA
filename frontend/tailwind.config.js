/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette DIGBA
        digba: {
          green:  '#16a34a',   // Score faible — risque bas
          yellow: '#ca8a04',   // Score modéré
          red:    '#dc2626',   // Score élevé — danger
          blue:   '#2563eb',   // Accent principal
          dark:   '#0f172a',   // Fond sombre
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
