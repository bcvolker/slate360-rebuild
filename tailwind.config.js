/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './components/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-red-500', 'text-red-500', 'min-h-screen', 'flex', 'items-center', 'justify-center', 'snap-start',
    'w-[40%]', 'w-[50%]', 'h-[60vh]', 'h-[70vh]'
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
