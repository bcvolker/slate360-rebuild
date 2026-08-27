import { spawn } from "node:child_process";

/**
 * Windows → WSL: wsl.exe -d Ubuntu-22.04 -- bash -lc '...'
 * Progress is JSONL on stdout. stderr is captured separately.
 */
export function wslCommand(script) {
  return {
    bin: "wsl.exe",
    args: ["-d", "Ubuntu-22.04", "--", "bash", "-lc", script],
  };
}

export function parseJsonl(chunk, onEvent) {
  const lines = String(chunk).split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      onEvent(JSON.parse(trimmed));
    } catch {
      /* ignore non-JSON */
    }
  }
}

export function spawnWsl(script, { onEvent, onLog, signal } = {}) {
  const { bin, args } = wslCommand(script);
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stdout.on("data", (buf) => {
      const text = buf.toString();
      onLog?.({ stream: "stdout", text });
      parseJsonl(text, onEvent);
    });
    child.stderr.on("data", (buf) => {
      const text = buf.toString();
      stderr += text;
      onLog?.({ stream: "stderr", text });
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, stderr });
      else reject(Object.assign(new Error(`wsl exited ${code}`), { stderr, code }));
    });
    if (signal) {
      signal.addEventListener("abort", () => {
        spawn("wsl.exe", ["-d", "Ubuntu-22.04", "--", "bash", "-lc", "pkill -f slam.py; pkill -f ffmpeg"], {
          windowsHide: true,
        });
        child.kill();
      });
    }
  });
}
