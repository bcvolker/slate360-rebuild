const withOpacity = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

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
        "brand-blue": "#4F89D4",
        "brand-copper": "#B37031",
        "brand-grey": "#F8F8FA",
        "brand-light-grey": "#646464",
        slate360: {
          blue: '#4F89D4',
          copper: '#B37031',
          grey: '#F8F8FA',
          lightGrey: '#646464',
          charcoal: '#1E1E1E',
          panel: '#FFFFFF',
        },
        theme: {
          canvas: withOpacity('--color-bg-canvas'),
          surface: withOpacity('--color-surface-primary'),
          surfaceAlt: withOpacity('--color-surface-elevated'),
          overlay: withOpacity('--color-surface-overlay'),
          border: withOpacity('--color-border-soft'),
          borderStrong: withOpacity('--color-border-strong'),
          text: withOpacity('--color-text-primary'),
          muted: withOpacity('--color-text-muted'),
          soft: withOpacity('--color-text-soft'),
          accent: withOpacity('--color-accent'),
          accentStrong: withOpacity('--color-accent-strong'),
          accentSecondary: withOpacity('--color-accent-secondary'),
        },
      },
      ringColor: {
        theme: withOpacity('--color-focus-ring'),
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        copperGlow: '0 0 18px rgba(179, 112, 49, 0.32)',
        blueGlow: '0 0 18px rgba(79, 137, 212, 0.32)',
      },
      borderRadius: {
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
