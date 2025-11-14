/** @type {import('tailwindcss').Config} */
module.exports = {
  // CONTENT PATHS: Confirmed - covers app/, components/, and lib/ directories
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#4B9CD3",
        "brand-copper": "#B87333",
        "brand-gray": "#475569",
      },
    },
  },
  plugins: [],
};
