import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        exo: {
          bg:      '#111721',
          metal:   '#1a1b27',
          panel:   '#1a2029',
          surface: '#1f252e',
          border:  '#212122',
          gold:    '#d4af37',
          goldDim: '#8b7322',
          text:    '#b1b1d8',
          muted:   '#767888',
        }
      },
      keyframes: {
        'pulse-led': {
          '0%, 100%': { opacity: '0.5' },
          '50%':       { opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-led': 'pulse-led 2s ease-in-out infinite',
        'fade-in':   'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    typography,
  ],
}
