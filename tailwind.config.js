/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#4B9CD3',
        'brand-copper': '#B87333',
        'brand-gray': '#2F2F2F',
        'surface-light': '#FFFFFF',
        'surface-dark': '#f0f2f5',
      },
    },
  },
  plugins: [],
};
