export type ThemeName = 'slate360' | 'dusk';

type ThemeTokens = Record<string, string>;

type ThemeRegistry = Record<ThemeName, ThemeTokens>;

export const themeTokens: ThemeRegistry = {
  slate360: {
    '--color-text-primary': '15 23 42', // Slate 900
    '--color-text-muted': '100 116 139', // Slate 500
    '--color-text-soft': '51 65 85', // Slate 700
    '--color-bg-canvas': '248 250 252', // Slate 50
    '--color-bg-gradient-top': '255 255 255', // White
    '--color-bg-gradient-mid': '241 245 249', // Slate 100
    '--color-bg-gradient-bottom': '248 250 252', // Slate 50
    '--color-surface-primary': '255 255 255', // White
    '--color-surface-elevated': '248 250 252', // Slate 50
    '--color-surface-overlay': '255 255 255', // White
    '--color-border-soft': '226 232 240', // Slate 200
    '--color-border-strong': '59 130 246', // Blue 500
    '--color-accent': '59 130 246', // Blue 500
    '--color-accent-strong': '37 99 235', // Blue 600
    '--color-accent-secondary': '245 158 11', // Amber 500
    '--color-focus-ring': '59 130 246', // Blue 500
    '--header-gradient-start': '255 255 255', // White
    '--header-gradient-end': '248 250 252', // Slate 50
    '--footer-gradient-top': '248 250 252', // Slate 50
    '--footer-gradient-bottom': '241 245 249', // Slate 100
    '--shadow-strong': '226 232 240', // Slate 200
    '--shadow-soft': '241 245 249', // Slate 100
  },
  dusk: {
    '--color-text-primary': '250 245 255',
    '--color-text-muted': '228 213 238',
    '--color-text-soft': '191 168 214',
    '--color-bg-canvas': '33 12 24',
    '--color-bg-gradient-top': '255 153 102',
    '--color-bg-gradient-mid': '224 78 57',
    '--color-bg-gradient-bottom': '33 12 24',
    '--color-surface-primary': '40 18 36',
    '--color-surface-elevated': '58 26 44',
    '--color-surface-overlay': '68 32 54',
    '--color-border-soft': '202 166 206',
    '--color-border-strong': '160 120 164',
    '--color-accent': '252 163 17',
    '--color-accent-strong': '219 114 7',
    '--color-accent-secondary': '244 114 182',
    '--color-focus-ring': '252 163 17',
    '--header-gradient-start': '54 15 36',
    '--header-gradient-end': '142 45 80',
    '--footer-gradient-top': '52 19 34',
    '--footer-gradient-bottom': '24 8 16',
    '--shadow-strong': '60 20 36',
    '--shadow-soft': '40 14 26',
  },
};

export const DEFAULT_THEME: ThemeName = 'slate360';

export const themeNames = Object.keys(themeTokens) as ThemeName[];

export function getThemeTokens(theme: ThemeName): ThemeTokens {
  return themeTokens[theme];
}

export const slateTheme = {
  colors: {
    blueprint: "#2f6bff",
    blueprintAccent: "#60a5fa",
    blueprintSoft: "#bfdbfe",
    graphiteDark: "#1e293b",
    graphite: "#475569",
    surfaceLight: "#f8fafc",
    copper: "#f59e0b",
    bgNavy: "#f1f5f9", // Remapped to light slate
  },
};
