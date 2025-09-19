/** @type {import('tailwindcss').Config} *//** @type {import('tailwindcss').Config} */

module.exports = {module.exports = {

  content: [  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],

    "./app/**/*.{js,ts,jsx,tsx,mdx}",  theme: {

    "./components/**/*.{js,ts,jsx,tsx,mdx}",    extend: {},

  ],  },

  theme: {  plugins: [],

    extend: {};
      colors: {
        'brand-blue': 'var(--color-brand-blue)',
        'brand-copper': 'var(--color-brand-copper)',
        'brand-gray': 'var(--color-brand-gray)',
        'surface-light': 'var(--color-surface-light)',
        'surface-dark': 'var(--color-surface-dark)',
      },
    },
  },
  plugins: [],
};
