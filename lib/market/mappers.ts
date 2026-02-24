import {
  MarketViewModel,
  MarketRiskTag,
  TradeViewModel,
  WhaleActivityViewModel,
  toNumberOrNull,
  toNumberOrZero,
} from "./contracts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function parseOutcomePrices(raw: unknown, fallbackProbabilityPct: number): { yes: number; no: number } {
  let yes: number | null = null;
  let no: number | null = null;

  if (Array.isArray(raw)) {
    yes = toNumberOrNull(raw[0]);
    no = toNumberOrNull(raw[1]);
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        yes = toNumberOrNull(parsed[0]);
        no = toNumberOrNull(parsed[1]);
      }
    } catch {
      // ignore malformed JSON
    }
  }

  if (yes !== null && yes > 1) yes = yes / 100;
  if (no !== null && no > 1) no = no / 100;

  if (yes === null) yes = clamp(fallbackProbabilityPct / 100, 0.01, 0.99);
  if (no === null) no = clamp(1 - yes, 0.01, 0.99);

  return {
    yes: clamp(yes, 0.01, 0.99),
    no: clamp(no, 0.01, 0.99),
  };
}

function deriveRiskTag(edgePct: number, probabilityPct: number, category: string, volume24hUsd: number): MarketRiskTag {
  const categoryLower = category.toLowerCase();
  if (edgePct > 20) return "hot";
  if (probabilityPct > 80 || probabilityPct < 20) return "high-risk";
  if (categoryLower.includes("construction")) return "construction";
  if (volume24hUsd > 50000) return "high-potential";
  return null;
}

export function mapGammaMarketToMarketVM(raw: unknown): MarketViewModel {
  const record = asRecord(raw);

  const fallbackProbabilityRaw = toNumberOrZero(record.probability);
  const fallbackProbabilityPct = fallbackProbabilityRaw <= 1 ? fallbackProbabilityRaw * 100 : fallbackProbabilityRaw;
  const prices = parseOutcomePrices(record.outcomePrices, fallbackProbabilityPct);

  const probabilityPct = clamp(prices.yes * 100, 0, 100);
  const volume24hUsd = toNumberOrZero(record.volume24hr);
  const liquidityUsd = toNumberOrZero(record.liquidity ?? record.volume);
  const spread = Math.abs(prices.yes - 0.5);
  const edgePct = Number((spread * 100 * 1.4).toFixed(1));

  const category = String(record.category ?? "General");
  const endDateRaw = record.endDate;
  const endDateIsoRaw = record.endDateIso;
  const eventStartRaw = record.startDate ?? record.eventStartDate;
  const eventStartTimeRaw = record.startDateIso ?? record.eventStartTime;

  const endDate = typeof endDateRaw === "string" && endDateRaw.length > 0 ? endDateRaw : null;
  const endDateIso = typeof endDateIsoRaw === "string" && endDateIsoRaw.length > 0
    ? endDateIsoRaw
    : endDate;
  const eventStartIso = typeof eventStartRaw === "string" && eventStartRaw.length > 0
    ? eventStartRaw
    : null;
  const eventStartTimeIso = typeof eventStartTimeRaw === "string" && eventStartTimeRaw.length > 0
    ? eventStartTimeRaw
    : null;

  return {
    id: String(record.id ?? record.conditionId ?? record.slug ?? ""),
    title: String(record.question ?? record.title ?? ""),
    category,
    probabilityPct: Number(probabilityPct.toFixed(1)),
    yesPrice: prices.yes,
    noPrice: prices.no,
    volume24hUsd,
    liquidityUsd,
    edgePct,
    riskTag: deriveRiskTag(edgePct, probabilityPct, category, volume24hUsd),
    endDate,
    endDateIso,
    eventStartIso,
    eventStartTimeIso,
  };
}

export function mapTradeRowToTradeVM(row: unknown): TradeViewModel {
  const record = asRecord(row);

  const avgPrice = clamp(toNumberOrZero(record.avg_price ?? record.price), 0.01, 0.99);
  const currentPriceRaw = toNumberOrNull(record.current_price);
  const currentPrice = clamp(currentPriceRaw ?? avgPrice, 0.01, 0.99);
  const pnl = toNumberOrZero(record.pnl);

  const outcomeRaw = String(record.outcome ?? record.side ?? "YES").toUpperCase();
  const outcome: "YES" | "NO" = outcomeRaw === "NO" ? "NO" : "YES";

  return {
    id: String(record.id ?? ""),
    marketId: String(record.market_id ?? record.marketId ?? ""),
    marketTitle: String(record.market_title ?? record.question ?? ""),
    outcome,
    shares: toNumberOrZero(record.shares),
    avgPrice,
    currentPrice,
    total: toNumberOrZero(record.total),
    pnl,
    status: String(record.status ?? "open"),
    paperTrade: Boolean(record.paper_trade ?? record.paperTrade ?? true),
    reason: record.reason == null ? null : String(record.reason),
    createdAt: String(record.created_at ?? record.createdAt ?? new Date(0).toISOString()),
    closedAt: record.closed_at == null ? null : String(record.closed_at),
  };
}

export function mapWhaleRowToWhaleVM(raw: unknown): WhaleActivityViewModel {
  const record = asRecord(raw);
  const outcomeRaw = String(record.outcome ?? (String(record.side ?? "").toUpperCase() === "SELL" ? "NO" : "YES")).toUpperCase();
  const outcome: "YES" | "NO" = outcomeRaw === "NO" ? "NO" : "YES";

  return {
    whaleAddress: String(record.proxyWallet ?? record.user ?? "unknown"),
    marketTitle: String(record.title ?? record.market ?? "Unknown market"),
    outcome,
    shares: toNumberOrZero(record.size ?? record.shares),
    amountUsd: toNumberOrZero(record.usdcSize ?? record.amount ?? record.amount_usd),
    timestamp: String(record.timestamp ?? new Date(0).toISOString()),
    category: String(record.category ?? "General"),
  };
}
