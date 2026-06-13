import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "../../.env.local"), "utf8");

function pick(key) {
  const m = src.match(new RegExp(`^${key}="([^"]*)"`, "m"));
  return m ? m[1] : "";
}

const keys = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "GPU_WORKER_SECRET_KEY",
];

const lines = keys.map((k) => `${k}=${pick(k)}`);
lines.push("R2_REGION=auto");
lines.push("SITE_URL=https://www.slate360.ai");

const outPath = path.join(__dirname, "../../workers/modal/thermal-analysis/.modal-secret.env");
fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${outPath}`);
