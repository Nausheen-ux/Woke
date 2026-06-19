// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    { pattern: /^top-\[/ },
    { pattern: /^bottom-\[/ },
    { pattern: /^left-\[/ },
    { pattern: /^right-\[/ },
    { pattern: /^text-\[/ },
    { pattern: /^animate-\[/ },
    'dots-on',
  ],
  theme: { extend: {} },
  plugins: [],
}