/**
 * Polymarket CLOB API helper
 *
 * Wraps the official @polymarket/clob-client SDK and raw REST calls
 * for order book depth, market resolution info, and activity feeds.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBookSnapshot {
  marketId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  fetchedAt: string;
}

export interface MarketResolution {
  marketId: string;
  title: string;
  description: string;
  resolutionSource: string | null;
  resolvedOutcome: string | null;
  resolvedAt: string | null;
  endDate: string | null;
  tags: string[];
}

export interface ActivityItem {
  id: string;
  marketId: string;
  marketTitle: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  size: number;
  price: number;
  timestamp: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CLOB_BASE = "https://clob.polymarket.com";
const GAMMA_BASE = "https://gamma-api.polymarket.com";
const UA = "Slate360/1.0";
const TIMEOUT_MS = 12_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function clobFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CLOB_BASE}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`CLOB ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function gammaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GAMMA_BASE}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gamma ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Order Book ───────────────────────────────────────────────────────────────

export async function getOrderBook(tokenId: string): Promise<OrderBookSnapshot> {
  // CLOB v2: GET /book?token_id=<token>
  const raw = await clobFetch<{
    market: string;
    asset_id: string;
    bids: { price: string; size: string }[];
    asks: { price: string; size: string }[];
  }>(`/book?token_id=${encodeURIComponent(tokenId)}`);

  const bids = (raw.bids ?? []).map((l) => ({
    price: parseFloat(l.price),
    size: parseFloat(l.size),
  }));
  const asks = (raw.asks ?? []).map((l) => ({
    price: parseFloat(l.price),
    size: parseFloat(l.size),
  }));

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 1;

  return {
    marketId: raw.market ?? tokenId,
    bids,
    asks,
    spread: parseFloat((bestAsk - bestBid).toFixed(4)),
    midPrice: parseFloat(((bestBid + bestAsk) / 2).toFixed(4)),
    fetchedAt: new Date().toISOString(),
  };
}

// ── Market Resolution Info ───────────────────────────────────────────────────

export async function getMarketResolution(
  marketId: string
): Promise<MarketResolution> {
  // Gamma API: GET /markets/<id>
  const raw = await gammaFetch<{
    id: string;
    question: string;
    description: string;
    resolution_source?: string;
    resolved_outcome?: string;
    resolved_at?: string;
    end_date_iso?: string;
    tags?: string[];
  }>(`/markets/${encodeURIComponent(marketId)}`);

  return {
    marketId: raw.id ?? marketId,
    title: raw.question ?? "",
    description: raw.description ?? "",
    resolutionSource: raw.resolution_source ?? null,
    resolvedOutcome: raw.resolved_outcome ?? null,
    resolvedAt: raw.resolved_at ?? null,
    endDate: raw.end_date_iso ?? null,
    tags: raw.tags ?? [],
  };
}

// ── Recent Trades / Activity Feed ────────────────────────────────────────────

export async function getMarketActivity(
  tokenId: string,
  limit = 50
): Promise<ActivityItem[]> {
  // CLOB v2: GET /trades?token_id=<token>&limit=<n>
  const raw = await clobFetch<
    {
      id: string;
      market: string;
      asset_id: string;
      side: string;
      outcome: string;
      size: string;
      price: string;
      created_at: string;
      match_time?: string;
      trader_side?: string;
    }[]
  >(`/trades?token_id=${encodeURIComponent(tokenId)}&limit=${limit}`);

  const items = Array.isArray(raw) ? raw : [];
  return items.map((t) => ({
    id: t.id ?? "",
    marketId: t.market ?? tokenId,
    marketTitle: "",
    side: (t.side?.toUpperCase() === "SELL" ? "SELL" : "BUY") as "BUY" | "SELL",
    outcome: (t.outcome?.toUpperCase() === "NO" ? "NO" : "YES") as "YES" | "NO",
    size: parseFloat(t.size || "0"),
    price: parseFloat(t.price || "0"),
    timestamp: t.match_time ?? t.created_at ?? new Date().toISOString(),
  }));
}

// ── Fast Market Search (optimized for speed) ─────────────────────────────────

export interface FastSearchParams {
  keyword?: string;
  categories?: string[];
  minVolume?: number;
  minEdge?: number;
  probRange?: [number, number];
  riskTags?: string[];
  sortBy?: "volume" | "edge" | "probability" | "endDate";
  sortDir?: "asc" | "desc";
  limit?: number;
}

export async function fastMarketSearch(params: FastSearchParams) {
  const qs = new URLSearchParams({
    limit: String(params.limit ?? 100),
    active: "true",
    closed: "false",
    order: "volume24hr",
    ascending: "false",
  });

  const res = await fetch(`${GAMMA_BASE}/markets?${qs.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Search ${res.status}`);

  const rows = (await res.json()) as Record<string, unknown>[];
  return Array.isArray(rows) ? rows : [];
}
