/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        serif:   ['"DM Serif Display"', 'serif'],
        mono:    ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}