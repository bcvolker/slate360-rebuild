#!/usr/bin/env node

/**
 * Paper-mode scheduler burst test harness.
 *
 * Runs multiple concurrent POST requests against:
 *   /api/market/scheduler/tick
 *
 * Required env:
 * - MARKET_SCHEDULER_SECRET
 *
 * Optional env:
 * - MARKET_BASE_URL (default: http://localhost:3000)
 * - BURST_REQUESTS (default: 30)
 * - BURST_CONCURRENCY (default: 6)
 * - BURST_TIMEOUT_MS (default: 30000)
 * - BURST_DELAY_MS (default: 0)
 */

const baseUrl = process.env.MARKET_BASE_URL ?? "http://localhost:3000";
const schedulerSecret = process.env.MARKET_SCHEDULER_SECRET ?? "";
const outputFormat = String(process.env.OUTPUT_FORMAT ?? "none").toLowerCase();
const outputFile = process.env.OUTPUT_FILE ?? "";

function asInt(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const totalRequests = asInt(process.env.BURST_REQUESTS, 30, { min: 1, max: 5000 });
const concurrency = asInt(process.env.BURST_CONCURRENCY, 6, { min: 1, max: 200 });
const timeoutMs = asInt(process.env.BURST_TIMEOUT_MS, 30_000, { min: 1_000, max: 120_000 });
const delayMs = asInt(process.env.BURST_DELAY_MS, 0, { min: 0, max: 10_000 });

if (!["none", "json", "csv"].includes(outputFormat)) {
  console.error("❌ OUTPUT_FORMAT must be one of: none, json, csv");
  process.exit(1);
}

if (outputFormat !== "none" && !outputFile) {
  console.error("❌ OUTPUT_FILE is required when OUTPUT_FORMAT is json or csv");
  process.exit(1);
}

if (!schedulerSecret) {
  console.error("❌ Missing MARKET_SCHEDULER_SECRET");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeOutputFile(filePath, content) {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function toCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvRows(rows) {
  const headers = [
    "index",
    "httpOk",
    "envelopeOk",
    "status",
    "elapsedMs",
    "usersConsidered",
    "usersExecuted",
    "tradesExecuted",
    "reason",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push([
      row.index,
      row.httpOk,
      row.envelopeOk,
      row.status,
      row.elapsedMs,
      row.usersConsidered,
      row.usersExecuted,
      row.tradesExecuted,
      toCsv(row.reason),
    ].join(","));
  }
  return lines.join("\n");
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function runSingle(index) {
  const started = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/market/scheduler/tick`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${schedulerSecret}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsedMs = Date.now() - started;
    const payload = await response.json().catch(() => ({}));

    const envelopeOk = Boolean(payload?.ok);
    const data = payload?.data ?? {};

    return {
      index,
      httpOk: response.ok,
      envelopeOk,
      status: response.status,
      elapsedMs,
      usersConsidered: Number(data.usersConsidered ?? 0),
      usersExecuted: Number(data.usersExecuted ?? 0),
      tradesExecuted: Number(data.totalTradesExecuted ?? 0),
      reason: envelopeOk ? "ok" : (payload?.error?.message ?? `HTTP_${response.status}`),
    };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    return {
      index,
      httpOk: false,
      envelopeOk: false,
      status: 0,
      elapsedMs,
      usersConsidered: 0,
      usersExecuted: 0,
      tradesExecuted: 0,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

async function main() {
  console.log("🚀 Market scheduler burst test");
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Requests: ${totalRequests}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log(`   Timeout/request: ${timeoutMs}ms`);
  console.log(`   Inter-request delay: ${delayMs}ms`);
  console.log(`   Output: ${outputFormat}${outputFile ? ` -> ${outputFile}` : ""}`);

  const startedAt = Date.now();
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, totalRequests) }, async () => {
    const results = [];

    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= totalRequests) break;

      if (delayMs > 0) await sleep(delayMs);
      const result = await runSingle(current + 1);
      results.push(result);

      const mark = result.httpOk && result.envelopeOk ? "✅" : "❌";
      console.log(
        `${mark} #${String(result.index).padStart(3, "0")} ` +
          `status=${result.status || "ERR"} ` +
          `latency=${result.elapsedMs}ms ` +
          `users=${result.usersExecuted}/${result.usersConsidered} ` +
          `trades=${result.tradesExecuted}`
      );
    }

    return results;
  });

  const nested = await Promise.all(workers);
  const results = nested.flat().sort((a, b) => a.index - b.index);
  const elapsedTotalMs = Date.now() - startedAt;

  const successes = results.filter((r) => r.httpOk && r.envelopeOk);
  const failures = results.filter((r) => !(r.httpOk && r.envelopeOk));
  const latencies = results.map((r) => r.elapsedMs);

  const totalTrades = results.reduce((sum, r) => sum + r.tradesExecuted, 0);
  const totalUsersExecuted = results.reduce((sum, r) => sum + r.usersExecuted, 0);
  const totalUsersConsidered = results.reduce((sum, r) => sum + r.usersConsidered, 0);
  const reqPerSec = elapsedTotalMs > 0 ? (results.length / (elapsedTotalMs / 1000)) : 0;
  const tradesPerSec = elapsedTotalMs > 0 ? (totalTrades / (elapsedTotalMs / 1000)) : 0;

  console.log("\n📊 Summary");
  console.log(`   Total Requests: ${results.length}`);
  console.log(`   Success: ${successes.length}`);
  console.log(`   Failure: ${failures.length}`);
  console.log(`   Success Rate: ${((successes.length / Math.max(1, results.length)) * 100).toFixed(1)}%`);
  console.log(`   Total Users Considered: ${totalUsersConsidered}`);
  console.log(`   Total Users Executed: ${totalUsersExecuted}`);
  console.log(`   Total Trades Executed: ${totalTrades}`);
  console.log(`   Burst Duration: ${(elapsedTotalMs / 1000).toFixed(2)}s`);
  console.log(`   Request Throughput: ${reqPerSec.toFixed(2)} req/s`);
  console.log(`   Trade Throughput: ${tradesPerSec.toFixed(2)} trades/s`);
  console.log(`   Latency p50: ${percentile(latencies, 50)}ms`);
  console.log(`   Latency p95: ${percentile(latencies, 95)}ms`);
  console.log(`   Latency max: ${Math.max(0, ...latencies)}ms`);

  if (failures.length > 0) {
    const grouped = failures.reduce((acc, item) => {
      const key = item.reason;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());

    console.log("\n⚠️ Failure breakdown");
    for (const [reason, count] of grouped.entries()) {
      console.log(`   - ${reason}: ${count}`);
    }
  }

  const summary = {
    timestampIso: new Date().toISOString(),
    baseUrl,
    totalRequests: results.length,
    successCount: successes.length,
    failureCount: failures.length,
    successRatePct: Number(((successes.length / Math.max(1, results.length)) * 100).toFixed(2)),
    totalUsersConsidered,
    totalUsersExecuted,
    totalTradesExecuted: totalTrades,
    burstDurationMs: elapsedTotalMs,
    requestThroughputPerSec: Number(reqPerSec.toFixed(4)),
    tradeThroughputPerSec: Number(tradesPerSec.toFixed(4)),
    latencyP50Ms: percentile(latencies, 50),
    latencyP95Ms: percentile(latencies, 95),
    latencyMaxMs: Math.max(0, ...latencies),
    config: {
      totalRequests,
      concurrency,
      timeoutMs,
      delayMs,
    },
  };

  if (outputFormat === "json") {
    const payload = {
      summary,
      results,
    };
    await writeOutputFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`\n💾 Wrote JSON report to ${outputFile}`);
  }

  if (outputFormat === "csv") {
    await writeOutputFile(outputFile, `${toCsvRows(results)}\n`);
    console.log(`\n💾 Wrote CSV report to ${outputFile}`);
  }

  if (successes.length === 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Burst test crashed:", error);
  process.exit(1);
});
