import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // One brand colour: deep teal-green. Used only for primary actions, active nav, links, selection.
        brand: {
          50: '#f0f7f5', 100: '#d9ebe6', 200: '#b3d7cd', 300: '#85bcae', 400: '#559c8b',
          500: '#2f7d6b', 600: '#0f5c4a', 700: '#0c4b3d', 800: '#0a3b30', 900: '#072a22',
        },
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'] },
    },
  },
} satisfies Config;
