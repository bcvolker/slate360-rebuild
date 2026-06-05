#!/usr/bin/env node
import { spawn } from "node:child_process";
import os from "node:os";

function getLanIpv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return null;
}

function parseArgs(argv) {
  const https = argv.includes("--https");
  const forwarded = argv.filter((arg) => arg !== "--https");
  let host = "0.0.0.0";
  let port = process.env.PORT || "3000";
  const passthrough = [];

  for (let index = 0; index < forwarded.length; index += 1) {
    const arg = forwarded[index];
    if (arg === "--hostname" || arg === "-H") {
      host = forwarded[index + 1] ?? host;
      index += 1;
      continue;
    }
    if (arg === "--port" || arg === "-p") {
      port = forwarded[index + 1] ?? port;
      index += 1;
      continue;
    }
    passthrough.push(arg);
  }

  return { https, host, port, passthrough };
}

const { https, host, port, passthrough } = parseArgs(process.argv.slice(2));
const lanIp = getLanIpv4();
const scheme = https ? "https" : "http";

console.log("");
console.log("  Slate360 dev server");
console.log(`  Local:   ${scheme}://localhost:${port}`);
if (lanIp && host === "0.0.0.0") {
  console.log(`  LAN:     ${scheme}://${lanIp}:${port}`);
  if (https) {
    console.log("  Phone:   accept the self-signed certificate once in Safari/Chrome.");
  } else {
    console.log("  Phone:   use dev:https for camera (getUserMedia needs a secure context).");
  }
} else if (host !== "0.0.0.0") {
  console.log(`  Bind:    ${scheme}://${host}:${port}`);
}
console.log("");

const nextArgs = ["dev", "-H", host, "--port", String(port), ...passthrough];
if (https) nextArgs.push("--experimental-https");

const child = spawn("npx", ["next", ...nextArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
