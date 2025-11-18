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
        slate360: {
          blue: '#4B9CD3',
          copper: '#B46E3A',
          copperDark: '#8D522C',
          charcoal: '#0B1014',
          charcoalSoft: '#11161C',
          panel: '#141A21',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        copperGlow: '0 0 18px rgba(180, 110, 58, 0.32)',
        blueGlow: '0 0 18px rgba(75, 156, 211, 0.32)',
      },
      borderRadius: {
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
