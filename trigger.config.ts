import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalPackages, syncEnvVars } from "@trigger.dev/build/extensions/core";
import { existsSync, readFileSync } from "node:fs";

const triggerEnvNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "R2_BUCKET",
  "R2_REGION",
  "R2_ENDPOINT",
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "MODAL_TWIN_ENDPOINT",
  "MODAL_THERMAL_ENDPOINT",
  "MODAL_THERMAL_INTERPRET_ENDPOINT",
  "MODAL_TOUR_ENDPOINT",
  "MODAL_CONTENT_ENDPOINT",
  "MODAL_CONTENT_INGEST_ENDPOINT",
  "GPU_WORKER_SECRET_KEY",
  "SITE_URL",
];

export default defineConfig({
  project: "proj_ydquoejbfqidzbjioyno",
  maxDuration: 900,
  dirs: ["src/trigger"],
  build: {
    extensions: [
      additionalPackages({ packages: ["@napi-rs/canvas"] }),
      syncEnvVars(() => pickTriggerEnv()),
    ],
    // @ts-ignore - Ignore type error as this is needed for Trigger.dev worker infrastructure
    systemDependencies: ["libcairo2-dev", "libpango1.0-dev", "libjpeg-dev", "libgif-dev", "librsvg2-dev"]
  }
});

// Add build configuration to ignore optional dependencies if needed

function pickTriggerEnv() {
  const localEnv = readLocalEnvFile();
  return Object.fromEntries(
    triggerEnvNames
      .map((name) => [name, process.env[name] ?? localEnv[name] ?? ""] as const)
      .filter(([, value]) => value.length > 0)
  );
}

function readLocalEnvFile() {
  if (!existsSync(".env.local")) return {} as Record<string, string>;
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const name = line.slice(0, index);
        const raw = line.slice(index + 1).trim();
        return [name, raw.replace(/^"|"$/g, "")];
      })
  );
}
