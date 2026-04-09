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
          bg:      '#080A0F',
          metal:   '#272a30',
          panel:   '#1A1E29',
          surface: '#232836',
          border:  '#838387',
          accent:  '#edd554', // Cold Bright Gold
          accentDim: '#fbc015',
          text:    '#E0E7FF',
          muted:   '#b1b5c8',
        }
      },
      boxShadow: {
        'glow-sharp': '0 0 1px #fff, 0 0 4px rgba(255, 215, 0, 0.8), 0 0 12px rgba(255, 215, 0, 0.4)',
        'glow-subtle': '0 0 1px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 215, 0, 0.3)',
        'btn-physical': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)',
        'btn-physical-active': 'inset 0 1px 2px rgba(0, 0, 0, 0.8), 0 1px 1px rgba(255, 255, 255, 0.05)',
        'glass-inset': 'inset 0 0 10px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.05)',
      },
      keyframes: {
        'blink-sharp': {
          '0%, 100%': { opacity: '0.2' },
          '50%':       { opacity: '1', filter: 'brightness(1.5)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', filter: 'brightness(1)' },
          '50%':       { opacity: '1', filter: 'brightness(1.8) drop-shadow(0 0 8px #FFD700)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'blink-sharp': 'blink-sharp 1.5s step-end infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'fade-in':   'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    typography,
  ],
}
