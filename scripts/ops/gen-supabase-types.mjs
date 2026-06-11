#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

const out = execSync("npx supabase gen types typescript --linked --schema public", {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
  stdio: ["ignore", "pipe", "pipe"],
});

fs.mkdirSync("lib/supabase", { recursive: true });
fs.writeFileSync("lib/supabase/database.types.ts", out, "utf8");
console.log("Wrote lib/supabase/database.types.ts", out.length, "chars");
