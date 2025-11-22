'use client';

import { DEFAULT_THEME, ThemeName, getThemeTokens } from './theme';

const CSS_VARIABLE_PREFIX = '--';

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  const tokens = getThemeTokens(theme);

  root.dataset.theme = theme;

  Object.entries(tokens).forEach(([key, value]) => {
    if (key.startsWith(CSS_VARIABLE_PREFIX)) {
      root.style.setProperty(key, value);
    }
  });
}

export function resetTheme() {
  applyTheme(DEFAULT_THEME);
}
