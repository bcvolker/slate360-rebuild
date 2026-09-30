import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// tsconfig keeps `jsx: preserve` for Next; tests need JSX compiled to run component renders.
// e2e/ holds Playwright specs, which Vitest must not collect.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
