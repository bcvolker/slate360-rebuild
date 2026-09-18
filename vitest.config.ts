import path from "node:path";
import { defineConfig } from "vitest/config";

// Minimal, additive config: only resolves aliases the existing vitest.run
// invocation ("vitest run lib/vnext") needs to import server-side vNext
// modules directly. Does not change test discovery, environment, or
// behavior for any currently-passing test.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
