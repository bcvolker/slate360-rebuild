export type ThemeName = 'slate360' | 'dusk';

type ThemeTokens = Record<string, string>;

type ThemeRegistry = Record<ThemeName, ThemeTokens>;

export const themeTokens: ThemeRegistry = {
  slate360: {
    '--color-text-primary': '248 250 252',
    '--color-text-muted': '203 213 225',
    '--color-text-soft': '148 163 184',
    '--color-bg-canvas': '7 23 38',
    '--color-bg-gradient-top': '79 169 255',
    '--color-bg-gradient-mid': '44 141 255',
    '--color-bg-gradient-bottom': '7 23 38',
    '--color-surface-primary': '2 6 23',
    '--color-surface-elevated': '10 16 28',
    '--color-surface-overlay': '13 19 32',
    '--color-border-soft': '148 163 184',
    '--color-border-strong': '74 94 122',
    '--color-accent': '79 169 255',
    '--color-accent-strong': '44 141 255',
    '--color-accent-secondary': '184 115 51',
    '--color-focus-ring': '79 169 255',
    '--header-gradient-start': '15 23 42',
    '--header-gradient-end': '30 64 175',
    '--footer-gradient-top': '15 23 42',
    '--footer-gradient-bottom': '9 14 24',
    '--shadow-strong': '15 23 42',
    '--shadow-soft': '12 18 30',
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
