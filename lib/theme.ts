export type ThemeName = 'slate360' | 'dusk';

type ThemeTokens = Record<string, string>;

type ThemeRegistry = Record<ThemeName, ThemeTokens>;

export const themeTokens: ThemeRegistry = {
  slate360: {
    '--color-text-primary': '201 214 232', // Surface Light
    '--color-text-muted': '107 168 255', // Soft Blueprint Tint
    '--color-text-soft': '52 71 94', // Mid Graphite
    '--color-bg-canvas': '2 12 31', // Background Blueprint Navy
    '--color-bg-gradient-top': '0 71 187', // Primary Blueprint
    '--color-bg-gradient-mid': '26 93 255', // Electric Blueprint Accent
    '--color-bg-gradient-bottom': '2 12 31', // Background Blueprint Navy
    '--color-surface-primary': '10 26 47', // Deep Graphite
    '--color-surface-elevated': '52 71 94', // Mid Graphite
    '--color-surface-overlay': '10 26 47', // Deep Graphite
    '--color-border-soft': '107 168 255', // Soft Blueprint Tint
    '--color-border-strong': '26 93 255', // Electric Blueprint Accent
    '--color-accent': '0 71 187', // Primary Blueprint
    '--color-accent-strong': '26 93 255', // Electric Blueprint Accent
    '--color-accent-secondary': '255 177 94', // Copper Accent
    '--color-focus-ring': '26 93 255', // Electric Blueprint Accent
    '--header-gradient-start': '2 12 31', // Background Blueprint Navy
    '--header-gradient-end': '0 71 187', // Primary Blueprint
    '--footer-gradient-top': '10 26 47', // Deep Graphite
    '--footer-gradient-bottom': '2 12 31', // Background Blueprint Navy
    '--shadow-strong': '2 12 31', // Background Blueprint Navy
    '--shadow-soft': '10 26 47', // Deep Graphite
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
    blueprint: "#0047BB",
    blueprintAccent: "#1A5DFF",
    blueprintSoft: "#6BA8FF",
    graphiteDark: "#0A1A2F",
    graphite: "#34475E",
    surfaceLight: "#C9D6E8",
    copper: "#FFB15E",
    bgNavy: "#020C1F",
  },
};
