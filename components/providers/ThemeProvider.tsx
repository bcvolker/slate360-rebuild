"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Minimal theme provider — replaces next-themes@0.4.x which produces
// "Cannot read properties of null" errors in the Next.js 15 / React 19
// server bundle due to a webpack chunk initialization order issue.
// Theme is persisted to localStorage and applied as a class on <html>.

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const defaultContext: ThemeContextValue = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
};

// Lazily create context to avoid module-level createContext() running in a
// Sentry debug-id server chunk before the React SSR vendor module initializes.
let ThemeContext: React.Context<ThemeContextValue> | null = null;
function getThemeContext(): React.Context<ThemeContextValue> {
  if (!ThemeContext) {
    ThemeContext = createContext<ThemeContextValue>(defaultContext);
  }
  return ThemeContext;
}

export function useTheme() {
  return useContext(getThemeContext());
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Read saved preference on mount
  useEffect(() => {
    const saved = (localStorage.getItem("slate360-theme") ?? "system") as Theme;
    setThemeState(saved);
  }, []);

  // Apply class whenever theme changes
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, [theme]);

  // Listen for system preference changes when using "system" theme
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("slate360-theme", t);
  }

  const Context = getThemeContext();
  return (
    <Context.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </Context.Provider>
  );
}

/**
 * ThemeScript — inlines a tiny script in <head> to apply the saved theme class
 * before the page renders, preventing a flash of unstyled content on load.
 * Must be rendered server-side from app/layout.tsx.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('slate360-theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.classList.add(r);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

/**
 * ThemeApplier — applies saved theme class on mount without needing to wrap children.
 * Used when ThemeProvider can't wrap the full tree (e.g., in ClientProviders pattern).
 */
export function ThemeApplier() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("slate360-theme") ?? "system";
      const resolved = saved === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : saved;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    } catch {
      // ignore
    }
  }, []);
  return null;
}
