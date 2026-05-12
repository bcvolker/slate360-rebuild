import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_ydquoejbfqidzbjioyno",
  maxDuration: 900,
  dirs: ["src/trigger"],
  build: {
    // @ts-ignore - Ignore type error as this is needed for Trigger.dev worker infrastructure
    systemDependencies: ["libcairo2-dev", "libpango1.0-dev", "libjpeg-dev", "libgif-dev", "librsvg2-dev"]
  }
});

// Add build configuration to ignore optional dependencies if needed
