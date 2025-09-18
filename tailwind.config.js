/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'brand-blue': 'hsl(var(--color-brand-blue))',
        'brand-copper': 'hsl(var(--color-brand-copper))',
        'brand-gray': 'hsl(var(--color-brand-gray))',
      },
    },
  },
  plugins: [],
};