/** @type {import('tailwindcss').Config} *//** @type {import('tailwindcss').Config} */

module.exports = {module.exports = {

  content: [  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],

    "./app/**/*.{js,ts,jsx,tsx,mdx}",  theme: {

    "./components/**/*.{js,ts,jsx,tsx,mdx}",    extend: {},

  ],  },

  theme: {  plugins: [],

    extend: {};
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
