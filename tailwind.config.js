/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00C793',
          dark:    '#009e75',
          light:   '#e6faf5',
        }
      },
      fontFamily: {
        sans:  ['Plus Jakarta Sans', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
