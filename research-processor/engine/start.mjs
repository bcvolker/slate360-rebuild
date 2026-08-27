import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const procRoot = path.resolve(root, "..");

function spawnInherit(cmd, args) {
  const child = spawn(cmd, args, { cwd: procRoot, stdio: "inherit", shell: true, windowsHide: true });
  return child;
}

const engine = spawnInherit(process.execPath, [path.join(root, "orchestrator.mjs")]);
const vite = spawnInherit("npx", ["vite", "--port", "1420", "--strictPort"]);

console.log("Slate360 Research Processor");
console.log("  UI     http://127.0.0.1:1420");
console.log("  Engine http://127.0.0.1:8765");
console.log("RESEARCH ONLY — ODGS-SLAM is non-commercial academic use.");

function shutdown() {
  engine.kill();
  vite.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const rl = createInterface({ input: process.stdin });
rl.on("line", () => {});
