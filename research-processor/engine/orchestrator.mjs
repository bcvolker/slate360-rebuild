import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { collectEnvironment } from "./env.mjs";
import { buildJob, ensureRunLayout, runDir } from "./job.mjs";
import { runMockJob } from "./mock-run.mjs";
import { classifyError } from "./errors.mjs";
import { exportDiagnosticsZip, openFolder, saveModelAs, writeEnvironmentSnapshot } from "./diagnostics.mjs";
import { runRealJob } from "./real-run.mjs";

const PORT = Number(process.env.S360_PROCESSOR_PORT || 8765);

const state = {
  job: null,
  runRoot: null,
  env: null,
  events: [],
  logs: [],
  abort: null,
  running: false,
};

function json(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(body));
}

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function emit(evt) {
  state.events.push({ ts: Date.now(), ...evt });
  if (state.events.length > 500) state.events.splice(0, state.events.length - 500);
}

function logLine(line) {
  state.logs.push(line);
  if (state.logs.length > 2000) state.logs.splice(0, state.logs.length - 2000);
}

async function startJob(body) {
  if (state.running) throw new Error("A job is already running.");
  const job = buildJob(body);
  if (!job.input?.path) throw new Error("Drop a stitched 2:1 equirectangular MP4 first.");
  const env = state.env || (await collectEnvironment());
  if (!env.mockMode && !existsSync(job.input.path)) {
    throw new Error("Input MP4 path not found. Paste the full Windows path.");
  }
  const root = runDir(job.projectName);
  await ensureRunLayout(root);
  await writeFile(path.join(root, "job.json"), JSON.stringify(job, null, 2));
  await writeEnvironmentSnapshot(root, env);
  state.job = job;
  state.runRoot = root;
  state.events = [];
  state.logs = [];
  state.running = true;
  state.abort = new AbortController();

  const run = async () => {
    try {
      if (env.mockMode) {
        await runMockJob(job, root, {
          emit,
          log: logLine,
          signal: state.abort.signal,
        });
      } else {
        await runRealJob(job, root, {
          emit,
          log: logLine,
          signal: state.abort.signal,
        });
      }
    } catch (err) {
      emit({ stage: "error", error: classifyError(err.stderr || err.message) });
    } finally {
      state.running = false;
    }
  };
  run();
  return { runRoot: root, mock: env.mockMode, job };
}

const server = createServer(async (req, res) => {
  try {
    if (cors(req, res)) return;
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "slate360-research-processor" });
    }
    if (req.method === "GET" && url.pathname === "/api/env") {
      state.env = await collectEnvironment();
      return json(res, 200, state.env);
    }
    if (req.method === "GET" && url.pathname === "/api/job/status") {
      return json(res, 200, {
        running: state.running,
        job: state.job,
        runRoot: state.runRoot,
        events: state.events.slice(-40),
        logs: state.logs.slice(-200),
      });
    }
    if (req.method === "POST" && url.pathname === "/api/job/start") {
      const body = await readBody(req);
      const started = await startJob(body);
      return json(res, 200, started);
    }
    if (req.method === "POST" && url.pathname === "/api/job/cancel") {
      state.abort?.abort();
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/job/attach-run") {
      const body = await readBody(req);
      if (!body.runRoot || !body.spz) return json(res, 400, { error: "runRoot and spz required" });
      state.runRoot = body.runRoot;
      state.job = body.job || state.job;
      emit({
        stage: "complete",
        label: "Attached run",
        progress: 1,
        outputDir: body.runRoot,
        ply: body.ply || null,
        spz: body.spz,
        trajectory: body.trajectory || null,
        trajectoryPlot: body.trajectoryPlot || null,
      });
      return json(res, 200, { ok: true, runRoot: body.runRoot, spz: body.spz });
    }
    if (req.method === "POST" && url.pathname === "/api/open-folder") {
      const body = await readBody(req);
      const dir = body.dir || state.runRoot;
      if (!dir) return json(res, 400, { error: "No output folder yet." });
      await openFolder(dir);
      return json(res, 200, { ok: true, dir });
    }
    if (req.method === "POST" && url.pathname === "/api/save-copy") {
      const body = await readBody(req);
      if (!body.src || !body.dest) return json(res, 400, { error: "src and dest required" });
      await saveModelAs(body.src, body.dest);
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/diagnostics") {
      if (!state.runRoot) return json(res, 400, { error: "No run to export." });
      const result = await exportDiagnosticsZip(state.runRoot);
      return json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/api/screenshot") {
      const body = await readBody(req);
      if (!state.runRoot) return json(res, 400, { error: "No active run folder." });
      const dest = path.join(state.runRoot, "screenshots", body.name || `view_${Date.now()}.png`);
      await mkdir(path.dirname(dest), { recursive: true });
      const buf = Buffer.from(String(body.pngBase64 || "").replace(/^data:image\/png;base64,/, ""), "base64");
      await writeFile(dest, buf);
      await writeFile(
        dest.replace(/\.png$/, ".json"),
        JSON.stringify({ view: body.view, runRoot: state.runRoot, job: state.job, savedAt: new Date().toISOString() }, null, 2),
      );
      return json(res, 200, { path: dest });
    }
    if (req.method === "GET" && url.pathname.startsWith("/files/")) {
      const rel = decodeURIComponent(url.pathname.slice("/files/".length));
      const abs = path.resolve(rel);
      const data = await readFile(abs);
      res.writeHead(200, {
        "Content-Type": abs.endsWith(".spz") ? "application/octet-stream" : "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(data);
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    json(res, 500, { error: err.message, classified: classifyError(err.message) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[s360-processor] http://127.0.0.1:${PORT}`);
});
