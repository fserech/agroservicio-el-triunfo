/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00C793',
          dark:    '#009e75',
          light:   '#e6faf5',
        },
        brand: {
          50:  '#f0fdf8',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb8',
          400: '#4ade91',
          500: '#00C793',
          600: '#00a87c',
          700: '#008a65',
          800: '#006e51',
          900: '#005a43',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'fade-in':  'fade-in 0.2s ease-out',
      },
      keyframes: {
        'slide-in': { from: { opacity: '0', transform: 'translateX(1rem)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' },      to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in':  { from: { opacity: '0' },                                to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};