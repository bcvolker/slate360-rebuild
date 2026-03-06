import { DEFAULT_CONFIG } from "@/lib/market-bot";
import type { ScanAppliedConfig, ScanRequest } from "@/lib/market/contracts";

const SCAN_DEFAULTS = {
  maxPositions: 5,
  capitalPerTrade: 100,
  minEdgePct: 0,
  minVolumeUsd: 0,
  minProbabilityPct: 0,
  maxProbabilityPct: 100,
  riskMix: "balanced" as const,
};

const BOT_FOCUS_AREAS = [
  "all",
  "crypto",
  "politics",
  "sports",
  "weather",
  "economy",
  "construction",
  "real-estate",
  "entertainment",
] as const;

type BotFocusArea = (typeof BOT_FOCUS_AREAS)[number];

const REQUEST_KEYS = [
  "max_positions",
  "capital_per_trade",
  "capitalAlloc",
  "execute_trades",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function toBotFocusAreas(values: string[]): BotFocusArea[] {
  const normalized = values
    .map((value) => {
      const lower = value.toLowerCase();
      if (lower.includes("real estate")) return "real-estate";
      return lower;
    })
    .filter((value): value is BotFocusArea => BOT_FOCUS_AREAS.includes(value as BotFocusArea));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["all"];
}

export function getScanMaxMarketLimit(): number {
  const raw = Number(process.env.MARKET_SCAN_MAX_MARKET_LIMIT ?? 5000);
  if (!Number.isFinite(raw)) return 5000;
  return clamp(Math.floor(raw), 100, 20000);
}

export function parseScanRequest(raw: unknown): {
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
    ? body.focus_areas.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : DEFAULT_CONFIG.focusAreas;
  const focusAreas = toBotFocusAreas(focusAreasInput);

  const whaleFollow = typeof body.whale_follow === "boolean" ? body.whale_follow : DEFAULT_CONFIG.whaleWatch;
  const paperMode = typeof body.paper_mode === "boolean" ? body.paper_mode : DEFAULT_CONFIG.paperMode;
  const executeTrades = typeof body.execute_trades === "boolean" ? body.execute_trades : true;

  const minProbabilityPct = clamp(toPercent(rawMinProbability), 0, 100);
  const maxProbabilityPct = clamp(toPercent(rawMaxProbability), 0, 100);

  const request: ScanRequest = {
    paperMode,
    executeTrades,
    maxPositions: clamp(Number.isFinite(rawMaxPositions) ? Math.round(rawMaxPositions) : SCAN_DEFAULTS.maxPositions, 1, 5000),
    capitalPerTrade: clamp(Number.isFinite(rawCapitalPerTrade) ? rawCapitalPerTrade : SCAN_DEFAULTS.capitalPerTrade, 1, 1_000_000),
    minEdge: clamp(toPercent(rawMinEdge), 0, 100),
    minVolume: clamp(Number.isFinite(rawMinVolume) ? rawMinVolume : SCAN_DEFAULTS.minVolumeUsd, 0, 1_000_000_000),
    minProbability: Math.min(minProbabilityPct, maxProbabilityPct),
    maxProbability: Math.max(minProbabilityPct, maxProbabilityPct),
    whaleFollow,
    riskMix,
    focusAreas,
  };

  const appliedConfig: ScanAppliedConfig = {
    paperMode: request.paperMode,
    executeTrades: request.executeTrades,
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
  if (!Number.isFinite(rawCapitalPerTrade) && !("capitalAlloc" in body)) errors.push("capital_per_trade must be numeric");
  if (!Number.isFinite(rawMinEdge)) errors.push("min_edge must be numeric");
  if (!Number.isFinite(rawMinVolume)) errors.push("min_volume must be numeric");
  if (!Number.isFinite(rawMinProbability)) errors.push("min_probability must be numeric");
  if (!Number.isFinite(rawMaxProbability)) errors.push("max_probability must be numeric");
  if ("market_limit" in body && !Number.isFinite(rawMarketLimit)) errors.push("market_limit must be numeric");

  return { request, appliedConfig, providedKeys, errors };
}
