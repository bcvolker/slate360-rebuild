import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// tsconfig keeps `jsx: preserve` for Next; tests need JSX compiled to run component renders.
// e2e/ holds Playwright specs, which Vitest must not collect.
// "server-only" is stubbed so vNext's server-side modules can be imported directly by tests.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
