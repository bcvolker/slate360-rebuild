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
        "brand-blue": "#0047BB",
        "brand-copper": "#FFB15E",
        "brand-grey": "#C9D6E8",
        "brand-light-grey": "#6BA8FF",
        slate360: {
          bg: 'rgb(var(--slate-bg-light))',
          bgAlt: 'rgb(var(--slate-bg-alt))',
          blueprint: 'rgb(var(--slate-blueprint))',
          blueprintLight: 'rgb(var(--slate-blueprint-light))',
          blue: 'rgb(var(--slate-blue))',
          graphite: 'rgb(var(--slate-graphite))',
          graphiteSoft: 'rgb(var(--slate-graphite-soft))',
          silver: 'rgb(var(--slate-silver))',
          copper: 'rgb(var(--slate-copper))',
          text: 'rgb(var(--slate-text-main))',
          textMuted: 'rgb(var(--slate-text-muted))',
        },
        slate: {
          blueprint: '#0047BB',
          blueprintAccent: '#1A5DFF',
          blueprintSoft: '#6BA8FF',
          graphiteDark: '#0A1A2F',
          graphite: '#34475E',
          surfaceLight: '#C9D6E8',
          copper: '#FFB15E',
          bgNavy: '#020C1F',
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
