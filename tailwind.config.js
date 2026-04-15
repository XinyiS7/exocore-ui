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
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      lineHeight: {
        'ultra-tight': '0.87',
        'tight-1': '1.0',
        'tight-12': '1.2',
      },
      colors: {
        exo: {
          bg:      '#0f0f0f', // Void Black
          pure:    '#000000', // Pure Black
          metal:   '#1a1a1a',
          panel:   '#121212',
          surface: '#181818',
          border:  'rgba(255, 255, 255, 0.1)', // Border Mist 10
          mist: {
            4:  'rgba(255, 255, 255, 0.04)',
            6:  'rgba(255, 255, 255, 0.06)',
            8:  'rgba(255, 255, 255, 0.08)',
            10: 'rgba(255, 255, 255, 0.10)',
            12: 'rgba(255, 255, 255, 0.12)',
            20: 'rgba(255, 255, 255, 0.20)',
          },
          accent:  '#d4af37', // Exo Gold
          accentGlow: '#FFD700', // Electric Gold
          text:    '#ffffff',
          muted:   'rgba(255, 255, 255, 0.6)', // Ghost White
          smoke:   '#444444',
        }
      },
      boxShadow: {
        'brutalist': '4px 4px 0px 0px rgba(0, 0, 0, 0.5)',
        'brutalist-gold': '4px 4px 0px 0px #d4af37',
        'glow-sharp': '0 0 1px #fff, 0 0 4px rgba(212, 175, 55, 0.8), 0 0 12px rgba(212, 175, 55, 0.4)',
        'glow-gold': '0 0 20px rgba(212, 175, 55, 0.15)',
        'btn-physical': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.5)',
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
    ({ addVariant }) => {
      addVariant('standalone', '@media (display-mode: standalone)');
    },
  ],
}
