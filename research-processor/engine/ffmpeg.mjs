import { spawn } from "node:child_process";
import path from "node:path";

/**
 * Extract a 2:1 PNG sequence for ODGS PanoramaParser (lexical *.png).
 * FFmpeg numbering starts at 0 so glob sort matches frame order.
 */
export function buildExtractArgs({
  inputPath,
  outDir,
  fps = 2,
  width = 960,
  height = 480,
  maxSeconds = 120,
} = {}) {
  const dest = path.join(outDir, "%04d.png");
  const vf = `fps=${fps},scale=${width}:${height}:flags=lanczos`;
  const args = ["-hide_banner", "-y"];
  if (maxSeconds) args.push("-t", String(maxSeconds));
  args.push("-i", inputPath, "-vf", vf, "-start_number", "0", dest);
  return args;
}

export function runFfmpeg(args, { onLog, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    let err = "";
    child.stderr.on("data", (buf) => {
      const text = buf.toString();
      err += text;
      onLog?.(text);
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else reject(new Error(`ffmpeg exited ${code}\n${err.slice(-2000)}`));
    });
    if (signal) {
      signal.addEventListener("abort", () => {
        child.kill("SIGTERM");
      });
    }
  });
}
