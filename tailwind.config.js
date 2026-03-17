// 1. 在顶部用 import 引入排版插件
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        exo: {
          bg: '#050507',
          panel: '#0f1014',
          border: '#1f2027',
          gold: '#d4af37',
          goldDim: '#8b7322',
          text: '#e2e8f0',
          muted: '#818190',
        }
      }
    },
  },
  plugins: [
    // 2. 在这里直接使用刚刚引入的变量
    typography,
  ],
}