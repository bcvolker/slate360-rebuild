#!/usr/bin/env node

import { readFile } from "node:fs/promises";

async function loadDotEnvLocal() {
  try {
    const source = await readFile(".env.local", "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;

      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // .env.local is optional in some environments.
  }
}

await loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const authToken = SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

const ENV_GROUPS = [
  {
    title: "Core Supabase",
    required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    title: "Live CLOB",
    required: ["POLYMARKET_API_KEY", "POLYMARKET_API_SECRET", "POLYMARKET_API_PASSPHRASE", "NEXT_PUBLIC_POLYMARKET_SPENDER"],
    optional: ["POLYMARKET_CLOB_HOST", "POLYMARKET_CLOB_ORDER_PATH", "POLYMARKET_CLOB_ORDER_TYPE", "POLYMARKET_CLOB_FEE_RATE_BPS"],
  },
  {
    title: "Scheduler",
    requiredAny: [["MARKET_SCHEDULER_SECRET", "CRON_SECRET"]],
    optional: ["MARKET_SCHEDULER_MIN_INTERVAL_SECONDS", "MARKET_SCHEDULER_MAX_INTERVAL_SECONDS", "MARKET_SCHEDULER_DEFAULT_BUYS_PER_DAY"],
  },
];

const TABLE_CHECKS = [
  {
    table: "market_trades",
    requiredColumns: ["id", "user_id", "market_id", "question", "side", "shares", "price", "total", "status", "pnl", "paper_trade", "reason", "created_at", "closed_at"],
    optionalColumns: ["idempotency_key", "token_id", "clob_order_id", "take_profit_pct", "stop_loss_pct", "entry_mode"],
  },
  {
    table: "market_directives",
    requiredColumns: ["id", "user_id", "name", "amount", "timeframe", "buys_per_day", "risk_mix", "whale_follow", "focus_areas", "profit_strategy", "paper_mode", "created_at", "updated_at"],
    optionalColumns: ["daily_loss_cap", "moonshot_mode", "total_loss_cap", "auto_pause_losing_days", "target_profit_monthly", "take_profit_pct", "stop_loss_pct"],
  },
  {
    table: "market_bot_runtime",
    requiredColumns: ["user_id", "status", "updated_at"],
  },
  {
    table: "market_bot_runtime_state",
    requiredColumns: ["user_id", "day_bucket", "runs_today", "trades_today", "last_run_at", "last_scan_at", "updated_at"],
    optionalColumns: ["last_error", "last_error_at"],
  },
  {
    table: "market_activity_log",
    requiredColumns: ["id", "user_id", "level", "message", "context", "created_at"],
  },
  {
    table: "market_scheduler_lock",
    requiredColumns: ["lock_key", "locked_until", "locked_by", "updated_at"],
  },
];

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function printSection(title) {
  console.log(`\n== ${title} ==`);
}

function printStatus(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

async function restSelect(table, columns) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}&limit=1`,
    {
      headers: {
        apikey: authToken,
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    },
  );

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { ok: response.ok, status: response.status, json };
}

function missingColumnFromMessage(message) {
  if (typeof message !== "string") return null;
  const match = message.match(/'([^']+)'/);
  return match?.[1] ?? null;
}

async function checkColumn(table, column) {
  const result = await restSelect(table, column);
  if (result.ok) return { ok: true };

  const errorCode = result.json?.code ?? null;
  const errorMessage = result.json?.message ?? "unknown_error";
  if (errorCode === "PGRST205" || errorCode === "42P01") {
    return { ok: false, type: "missing_table", detail: errorMessage };
  }

  const missingColumn = missingColumnFromMessage(errorMessage);
  if (missingColumn === column) {
    return { ok: false, type: "missing_column", detail: errorMessage };
  }

  return { ok: false, type: "other_error", detail: `${errorCode ?? result.status}: ${errorMessage}` };
}

function validateEnv() {
  printSection("Environment");
  let failed = false;

  for (const group of ENV_GROUPS) {
    for (const name of group.required ?? []) {
      const ok = Boolean(getEnv(name));
      printStatus(`${group.title} ${name}`, ok);
      if (!ok) failed = true;
    }

    for (const anyGroup of group.requiredAny ?? []) {
      const present = anyGroup.find((name) => Boolean(getEnv(name))) ?? null;
      const ok = Boolean(present);
      printStatus(`${group.title} one-of(${anyGroup.join(", ")})`, ok, present ? `using ${present}` : "none set");
      if (!ok) failed = true;
    }

    for (const name of group.optional ?? []) {
      const ok = Boolean(getEnv(name));
      console.log(`INFO ${group.title} ${name}: ${ok ? "set" : "unset"}`);
    }
  }

  return failed;
}

async function validateSchema() {
  printSection("Supabase Schema");
  let failed = false;

  for (const tableCheck of TABLE_CHECKS) {
    const requiredMissing = [];
    const optionalMissing = [];

    for (const column of tableCheck.requiredColumns) {
      const result = await checkColumn(tableCheck.table, column);
      if (!result.ok) {
        requiredMissing.push(`${column} (${result.type}: ${result.detail})`);
      }
    }

    for (const column of tableCheck.optionalColumns ?? []) {
      const result = await checkColumn(tableCheck.table, column);
      if (!result.ok && result.type === "missing_column") {
        optionalMissing.push(column);
      } else if (!result.ok && result.type === "missing_table") {
        requiredMissing.push(`${column} (${result.type}: ${result.detail})`);
      }
    }

    if (requiredMissing.length > 0) {
      failed = true;
      printStatus(`${tableCheck.table} required columns`, false, requiredMissing.join("; "));
    } else {
      printStatus(`${tableCheck.table} required columns`, true);
    }

    if ((tableCheck.optionalColumns ?? []).length > 0) {
      console.log(
        `INFO ${tableCheck.table} optional columns: ${optionalMissing.length > 0 ? `missing ${optionalMissing.join(", ")}` : "all present"}`,
      );
    }
  }

  return failed;
}

async function main() {
  console.log("[check-market-runtime] Inspecting Market Robot runtime prerequisites");

  if (!SUPABASE_URL || !authToken) {
    printStatus("Supabase connection bootstrap", false, "NEXT_PUBLIC_SUPABASE_URL and an API key are required");
    process.exit(1);
  }

  const envFailed = validateEnv();
  const schemaFailed = await validateSchema();

  if (envFailed || schemaFailed) {
    console.error("\n[check-market-runtime] FAILED");
    process.exit(1);
  }

  console.log("\n[check-market-runtime] PASS");
}

main().catch((error) => {
  console.error("[check-market-runtime] ERROR", error);
  process.exit(1);
});