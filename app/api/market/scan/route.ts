/**
 * POST /api/market/scan
 *
 * Scans Polymarket for opportunities using the bot brain.
 * Respects user's risk / portfolio / focus settings.
 * In paper mode, auto-executes paper trades and saves to Supabase.
 * In live mode, returns trade recommendations for client-side wallet signing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ApiEnvelope,
  ScanAppliedConfig,
  ScanRequest,
  ScanResponse,
} from "@/lib/market/contracts";
import { toNumberOrZero } from "@/lib/market/contracts";
import { mapTradeRowToTradeVM } from "@/lib/market/mappers";
import {
  fetchMarkets,
  scoreOpportunities,
  decideTrades,
  simulatePaperTrade,
  type BotConfig,
  DEFAULT_CONFIG,
} from "@/lib/market-bot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SCAN_DEFAULTS = {
  maxPositions: 5,
  capitalPerTrade: 100,
  minEdgePct: 0,
  minVolumeUsd: 0,
  minProbabilityPct: 0,
  maxProbabilityPct: 100,
  riskMix: "balanced" as const,
};

const BOT_FOCUS_AREAS = ["all", "crypto", "politics", "sports", "weather", "economy"] as const;
type BotFocusArea = (typeof BOT_FOCUS_AREAS)[number];

const REQUEST_KEYS = [
  "max_positions",
  "capital_per_trade",
  "capitalAlloc",
  "min_edge",
  "min_volume",
  "min_probability",
  "max_probability",
  "risk_mix",
  "focus_areas",
  "whale_follow",
  "paper_mode",
  "market_limit",
] as const;

function noStoreJson<T>(body: ApiEnvelope<T> & Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function toBotFocusAreas(values: string[]): BotFocusArea[] {
  const normalized = values
    .map((v) => {
      const lower = v.toLowerCase();
      if (lower.includes("construction")) return "economy";
      if (lower.includes("real estate")) return "economy";
      return lower;
    })
    .filter((v): v is BotFocusArea => BOT_FOCUS_AREAS.includes(v as BotFocusArea));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["all"];
}

function getScanMaxMarketLimit(): number {
  const raw = Number(process.env.MARKET_SCAN_MAX_MARKET_LIMIT ?? 5000);
  if (!Number.isFinite(raw)) return 5000;
  return clamp(Math.floor(raw), 100, 20000);
}

function parseScanRequest(raw: unknown): {
  request: ScanRequest;
  appliedConfig: ScanAppliedConfig;
  providedKeys: string[];
  errors: string[];
} {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const providedKeys = REQUEST_KEYS.filter((key) => key in body);

  const rawMaxPositions = Number(body.max_positions ?? SCAN_DEFAULTS.maxPositions);
  const rawCapitalPerTrade = Number(body.capital_per_trade ?? body.capitalAlloc ?? SCAN_DEFAULTS.capitalPerTrade);
  const rawMinEdge = Number(body.min_edge ?? SCAN_DEFAULTS.minEdgePct);
  const rawMinVolume = Number(body.min_volume ?? SCAN_DEFAULTS.minVolumeUsd);
  const rawMinProbability = Number(body.min_probability ?? SCAN_DEFAULTS.minProbabilityPct);
  const rawMaxProbability = Number(body.max_probability ?? SCAN_DEFAULTS.maxProbabilityPct);
  const rawMarketLimit = Number(body.market_limit ?? 0);
  const riskMix =
    body.risk_mix === "conservative" || body.risk_mix === "balanced" || body.risk_mix === "aggressive"
      ? body.risk_mix
        : SCAN_DEFAULTS.riskMix;
      const focusAreasInput = Array.isArray(body.focus_areas)
    ? body.focus_areas.map((f) => String(f).trim().toLowerCase()).filter(Boolean)
    : DEFAULT_CONFIG.focusAreas;
      const focusAreas = toBotFocusAreas(focusAreasInput);
  const whaleFollow = typeof body.whale_follow === "boolean" ? body.whale_follow : DEFAULT_CONFIG.whaleWatch;
  const paperMode = typeof body.paper_mode === "boolean" ? body.paper_mode : DEFAULT_CONFIG.paperMode;

  const minProbabilityPct = clamp(toPercent(rawMinProbability), 0, 100);
  const maxProbabilityPct = clamp(toPercent(rawMaxProbability), 0, 100);
  const probabilityLow = Math.min(minProbabilityPct, maxProbabilityPct);
  const probabilityHigh = Math.max(minProbabilityPct, maxProbabilityPct);

  const request: ScanRequest = {
    paperMode,
    maxPositions: clamp(Number.isFinite(rawMaxPositions) ? Math.round(rawMaxPositions) : SCAN_DEFAULTS.maxPositions, 1, 5000),
    capitalPerTrade: clamp(Number.isFinite(rawCapitalPerTrade) ? rawCapitalPerTrade : SCAN_DEFAULTS.capitalPerTrade, 1, 1_000_000),
    minEdge: clamp(toPercent(rawMinEdge), 0, 100),
    minVolume: clamp(Number.isFinite(rawMinVolume) ? rawMinVolume : SCAN_DEFAULTS.minVolumeUsd, 0, 1_000_000_000),
    minProbability: probabilityLow,
    maxProbability: probabilityHigh,
    whaleFollow,
    riskMix,
    focusAreas,
  };

  const appliedConfig: ScanAppliedConfig = {
    paperMode: request.paperMode,
    maxPositions: request.maxPositions,
    capitalPerTrade: request.capitalPerTrade,
    minEdgePct: request.minEdge,
    minVolumeUsd: request.minVolume,
    minProbabilityPct: request.minProbability,
    maxProbabilityPct: request.maxProbability,
    riskMix: request.riskMix,
    focusAreas: request.focusAreas,
    whaleFollow: request.whaleFollow,
  };

  const errors: string[] = [];
  if (!Number.isFinite(rawMaxPositions)) errors.push("max_positions must be numeric");
  if (!Number.isFinite(rawCapitalPerTrade) && !("capitalAlloc" in body)) {
    errors.push("capital_per_trade must be numeric");
  }
  if (!Number.isFinite(rawMinEdge)) errors.push("min_edge must be numeric");
  if (!Number.isFinite(rawMinVolume)) errors.push("min_volume must be numeric");
  if (!Number.isFinite(rawMinProbability)) errors.push("min_probability must be numeric");
  if (!Number.isFinite(rawMaxProbability)) errors.push("max_probability must be numeric");
  if ("market_limit" in body && !Number.isFinite(rawMarketLimit)) errors.push("market_limit must be numeric");

  return { request, appliedConfig, providedKeys, errors };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { request: requestConfig, appliedConfig, providedKeys, errors } = parseScanRequest(body);
    if (errors.length > 0) {
      return noStoreJson(
        {
          ok: false,
          error: {
            code: "invalid_scan_request",
            message: "Invalid scan request payload",
            details: { errors },
          },
          meta: {
            timestamp: new Date().toISOString(),
            ignoredKeys: [],
            appliedConfig,
          },
        },
        { status: 400 }
      );
    }

    // Load config from user_metadata and override with request payload from client controls.
    const savedConfig = user.user_metadata?.marketBotConfig;
    const config: BotConfig = {
      ...(savedConfig ? { ...DEFAULT_CONFIG, ...savedConfig } : DEFAULT_CONFIG),
      paperMode: requestConfig.paperMode,
      maxTradesPerScan: requestConfig.maxPositions,
      maxPositionUsd: requestConfig.capitalPerTrade,
      minOpportunityEdgePct: requestConfig.minEdge,
      maxCandidates: Math.max(requestConfig.maxPositions * 5, 200),
      riskLevel:
        requestConfig.riskMix === "conservative"
          ? "low"
          : requestConfig.riskMix === "aggressive"
            ? "high"
            : "medium",
      portfolioMix:
        requestConfig.riskMix === "conservative"
          ? { low: 70, medium: 25, high: 5 }
          : requestConfig.riskMix === "aggressive"
            ? { low: 20, medium: 35, high: 45 }
            : { low: 45, medium: 40, high: 15 },
      whaleWatch: requestConfig.whaleFollow,
      focusAreas: requestConfig.focusAreas.length > 0
        ? requestConfig.focusAreas
        : (savedConfig?.focusAreas ?? DEFAULT_CONFIG.focusAreas),
    };

    const ignoredKeys = providedKeys.filter((key) => key === "whale_follow");

    // Read bot status from market_bot_runtime table
    const { data: botSettings } = await supabase
      .from("market_bot_runtime")
      .select("status")
      .eq("user_id", user.id)
      .single();

    const botStatus = botSettings?.status ?? "stopped";

    // Must be running unless this is an explicit one-off paper test scan.
    const oneOffPaperScan = config.paperMode === true;
    if (botStatus === "stopped" && !oneOffPaperScan) {
      return noStoreJson(
        { ok: false, error: { code: "bot_stopped", message: "Bot is stopped" } },
        { status: 400 }
      );
    }
    if (botStatus === "paused" && !oneOffPaperScan) {
      return noStoreJson(
        { ok: false, error: { code: "bot_paused", message: "Bot is paused" } },
        { status: 400 }
      );
    }

    // 1. Fetch markets
    const requestedMarketLimit = Number((body as Record<string, unknown>)?.market_limit ?? 0);
    const marketLimit = clamp(
      Number.isFinite(requestedMarketLimit) && requestedMarketLimit > 0
        ? requestedMarketLimit
        : Math.max(requestConfig.maxPositions * 8, 120),
      50,
      getScanMaxMarketLimit()
    );
    const markets = await fetchMarkets(config.focusAreas ?? ["all"], marketLimit);

    // 2. Score opportunities + apply request-level controls explicitly
    const scored = scoreOpportunities(markets, config);
    const opportunities = scored.filter((opp) => {
      const probabilityPct = opp.yesPrice * 100;
      if (opp.edge < requestConfig.minEdge) return false;
      if (opp.volume24h < requestConfig.minVolume) return false;
      if (probabilityPct < requestConfig.minProbability || probabilityPct > requestConfig.maxProbability) return false;
      return true;
    });

    // 3. Get today's P&L from saved trades
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnl = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.pnl), 0) ?? 0;

    // 4. Decide trades
    const baseDecisions = decideTrades(opportunities, config, dailyPnl);
    const tradeDecisions = baseDecisions
      .map((decision) => {
        const price = decision.side === "YES" ? decision.opp.yesPrice : decision.opp.noPrice;
        const maxSharesByCapital = Math.floor(requestConfig.capitalPerTrade / Math.max(price, 0.01));
        const shares = Math.max(1, Math.min(decision.shares, maxSharesByCapital));
        return {
          ...decision,
          shares,
          reason: `${decision.reason}; capped by capitalPerTrade $${requestConfig.capitalPerTrade.toFixed(2)}`,
        };
      })
      .slice(0, requestConfig.maxPositions);

    // 5. Execute paper trades or return recommendations
    const executedTrades: ReturnType<typeof simulatePaperTrade>[] = [];

    if (config.paperMode || botStatus === "paper") {
      const simulatedTrades = tradeDecisions.map((decision) => {
        const trade = simulatePaperTrade(
          user.id,
          decision.opp,
          decision.side,
          decision.shares,
        );
        return { trade, reason: decision.reason };
      });

      if (simulatedTrades.length > 0) {
        const rows = simulatedTrades.map(({ trade, reason }) => ({
            user_id: user.id,
            market_id: trade.marketId,
            question: trade.question,
            side: trade.side,
            shares: trade.shares,
            price: trade.price,
            total: trade.total,
            status: trade.status,
            pnl: trade.pnl,
            paper_trade: true,
            reason,
          }));

        const { error: insertErr } = await supabase
          .from("market_trades")
          .insert(rows);

        if (!insertErr) {
          executedTrades.push(...simulatedTrades.map((item) => item.trade));
        }
      }
    }

    const mappedTrades = executedTrades.map((trade) =>
      mapTradeRowToTradeVM({
        id: trade.id,
        market_id: trade.marketId,
        question: trade.question,
        side: trade.side,
        shares: trade.shares,
        price: trade.price,
        total: trade.total,
        status: trade.status,
        pnl: trade.pnl,
        paper_trade: true,
        created_at: trade.createdAt,
      })
    );

    const decisions = tradeDecisions.map((d) => ({
      marketId: d.opp.id,
      question: d.opp.question,
      side: d.side,
      shares: d.shares,
      why: d.reason,
      edge: d.opp.edge,
    }));

    const scannedAtIso = new Date().toISOString();
    const payload: ScanResponse = {
      scannedAtIso,
      marketsScanned: markets.length,
      opportunitiesFound: opportunities.length,
      decisions,
      executed: mappedTrades,
      appliedConfig,
    };

    return noStoreJson({
      ok: true,
      data: payload,
      meta: {
        timestamp: scannedAtIso,
        ignoredKeys,
        appliedConfig,
      },
    });
  } catch (err) {
    console.error("[api/market/scan]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "scan_unhandled_error",
          message: err instanceof Error ? err.message : "Scan failed",
        },
      },
      { status: 500 }
    );
  }
}
