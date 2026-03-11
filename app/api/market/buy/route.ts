import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import { getClobOrderId, submitClobOrder } from "@/lib/market/clob-api";
import {
  validateTradeInput,
  calculatePositionSize,
  checkSafetyConstraints,
} from "@/lib/market/execution-policy";
import {
  getUnsupportedMarketTradeColumn,
  insertMarketTradesWithFallback,
  updateMarketTradeWithFallback,
} from "@/lib/market/trade-persistence";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const CLOB_ORDER_PATH = process.env.POLYMARKET_CLOB_ORDER_PATH ?? "/order";
const CLOB_ORDER_TYPE = process.env.POLYMARKET_CLOB_ORDER_TYPE ?? "GTC";
const CLOB_FEE_RATE_BPS = process.env.POLYMARKET_CLOB_FEE_RATE_BPS ?? "200";
const DEFAULT_MAX_OPEN_POSITIONS = 25;

function makeOrderNonce(): string {
  const micros = BigInt(Date.now()) * BigInt(1000);
  const entropy = BigInt(Math.floor(Math.random() * 1_000_000));
  return (micros + entropy).toString();
}

export const POST = (req: NextRequest) =>
  withMarketAuth(req, async ({ user, admin }) => {
    const body = await req.json();
    const {
      market_id,
      market_title,
      outcome,
      amount,
      avg_price,
      category,
      probability,
      paper_mode = true,
      wallet_address,
      token_id,
      take_profit_pct,
      stop_loss_pct,
      idempotency_key,
    } = body;

    let supportsIdempotencyLookup = true;

    if (idempotency_key) {
      const { data: existingTrade, error: existingTradeError } = await admin
        .from("market_trades")
        .select()
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

      const missingIdempotencyColumn = getUnsupportedMarketTradeColumn(existingTradeError);

      if (missingIdempotencyColumn === "idempotency_key") {
        supportsIdempotencyLookup = false;
      }

      if (existingTradeError && supportsIdempotencyLookup) {
        return NextResponse.json({ error: existingTradeError.message }, { status: 500 });
      }

      if (supportsIdempotencyLookup && existingTrade) {
        return NextResponse.json({
          success: true,
          mode: "idempotent_recovery",
          trade: existingTrade,
          summary: `Recovered existing trade order.`,
        });
      }
    }

    const missingFields: string[] = [];

    if (!market_id || String(market_id).trim().length === 0) missingFields.push("market_id");
    if (!market_title || String(market_title).trim().length === 0) missingFields.push("market_title");
    if (!outcome) missingFields.push("outcome");
    if (typeof amount !== "number" || !Number.isFinite(amount)) missingFields.push("amount");
    if (typeof avg_price !== "number" || !Number.isFinite(avg_price)) missingFields.push("avg_price");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields", missingFields },
        { status: 400 }
      );
    }

    // Unified trade validation (shared with scan route)
    const validationError = validateTradeInput({ amount, avgPrice: avg_price, outcome });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Unified position sizing (shared with scan route)
    const { shares, maxPayout } = calculatePositionSize({
      amount,
      avgPrice: avg_price,
      maxPctPerTrade: null, // Direct buy: no portfolio cap override by default
      capitalAlloc: amount,
    });

    // Unified safety constraints (shared with scan route)
    const maxOpenPositions = Number(process.env.MARKET_MAX_OPEN_POSITIONS) || DEFAULT_MAX_OPEN_POSITIONS;
    const safetyCheck = await checkSafetyConstraints({
      userId: user.id,
      supabase: admin,
      maxOpenPositions,
    });

    if (!safetyCheck.allowed) {
      return NextResponse.json(
        { error: safetyCheck.reason, openPositions: safetyCheck.openPositionsCount, limit: maxOpenPositions },
        { status: 400 }
      );
    }

    if (paper_mode) {
      const { data: trade, error } = await insertMarketTradesWithFallback(
        admin,
        {
          user_id: user.id, idempotency_key: idempotency_key ?? null,
          market_id, question: market_title, side: outcome,
          shares, price: avg_price, total: amount,
          status: "open", pnl: 0, paper_trade: true,
          take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
          stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
          entry_mode: "direct_buy",
          reason: `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
        },
        { single: true },
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        success: true, mode: "paper", trade,
        summary: `Paper trade saved: ${shares.toFixed(1)} ${outcome} shares @ $${avg_price.toFixed(3)}`,
      });
    }

    if (!wallet_address || !EVM_ADDRESS_REGEX.test(wallet_address)) {
      return NextResponse.json({ error: "Valid wallet_address required for live trades" }, { status: 400 });
    }

    const clob_host = process.env.POLYMARKET_CLOB_HOST ?? "https://clob.polymarket.com";
    const api_key = process.env.POLYMARKET_API_KEY;
    const api_secret = process.env.POLYMARKET_API_SECRET;
    const api_passphrase = process.env.POLYMARKET_API_PASSPHRASE;

    if (!api_key || !api_secret || !api_passphrase || !token_id) {
      const reason = !token_id ? "Missing token_id" : "CLOB API unconfigured";
      const { data: trade, error } = await insertMarketTradesWithFallback(
        admin,
        {
          user_id: user.id, idempotency_key: idempotency_key ?? null,
          market_id, question: market_title, side: outcome,
          shares, price: avg_price, total: amount, status: "open",
          pnl: 0, paper_trade: true, token_id: token_id ?? null,
          take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
          stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
          entry_mode: "live_fallback", reason: `Saved as paper — ${reason}`,
        },
        { single: true },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        success: true, mode: "paper_fallback", trade,
        warning: reason,
      });
    }

    // 1. Create Pending state in DB BEFORE hitting CLOB to prevent silent timeouts charging users
    const { data: pendingTrade, error: pendingError } = await insertMarketTradesWithFallback<{
      id: string;
    }>(
      admin,
      {
        user_id: user.id, idempotency_key: idempotency_key ?? null,
        market_id, question: market_title, side: outcome,
        shares, price: avg_price, total: amount, status: "pending",
        pnl: 0, paper_trade: false, token_id,
        take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
        stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
        entry_mode: "live", reason: `Live CLOB trade initiating...`,
      },
      { single: true },
    );

    if (pendingError) {
      return NextResponse.json({ error: "Failed to initialize trade state in DB" }, { status: 500 });
    }
    if (!pendingTrade) {
      return NextResponse.json({ error: "Trade state was not returned from DB" }, { status: 500 });
    }

    try {
      // 2. Submit to CLOB
      const { clobRes, clobData } = await submitClobOrder({
        clob_host, api_key, api_secret, api_passphrase, wallet_address, token_id, outcome, shares, avg_price,
        CLOB_ORDER_TYPE, CLOB_FEE_RATE_BPS, CLOB_ORDER_PATH, nonce: makeOrderNonce()
      });

      if (!clobRes.ok) {
        // Update DB to failed
        const { data: failedTrade } = await updateMarketTradeWithFallback(
          admin,
          pendingTrade.id,
          {
            status: "open", paper_trade: true, entry_mode: "clob_reject_fallback",
            reason: `CLOB rejected (${clobRes.status}): ${JSON.stringify(clobData)}`,
          },
          { single: true },
        );
        
        return NextResponse.json({
          success: false, mode: "clob_error", clob_status: clobRes.status,
          clob_response: clobData, trade: failedTrade,
        }, { status: 422 });
      }

      // 3. Mark DB Trade as Open + Live
      const clobOrderId = getClobOrderId(clobData);
      if (!clobOrderId) {
        const { data: failedTrade } = await updateMarketTradeWithFallback(
          admin,
          pendingTrade.id,
          {
            status: "open", paper_trade: true, entry_mode: "clob_invalid_success_fallback",
            reason: `CLOB response missing order id: ${JSON.stringify(clobData)}`,
          },
          { single: true },
        );

        return NextResponse.json({
          success: false,
          mode: "clob_invalid_success",
          error: "CLOB returned success without an order id",
          clob_response: clobData,
          trade: failedTrade,
        }, { status: 502 });
      }

      const { data: finalTrade } = await updateMarketTradeWithFallback(
        admin,
        pendingTrade.id,
        {
          status: "open",
          clob_order_id: clobOrderId,
          reason: `Live CLOB order ${clobOrderId}`,
        },
        { single: true },
      );

      return NextResponse.json({
        success: true, mode: "live", trade: finalTrade, clob_order_id: clobOrderId,
        summary: `Live order placed: ${shares.toFixed(1)} ${outcome} @ $${avg_price.toFixed(3)}`,
      });
    } catch (clobErr) {
      console.error("[api/market/buy] CLOB submission error:", clobErr);
      const { data: fallbackTrade } = await updateMarketTradeWithFallback(
        admin,
        pendingTrade.id,
        {
          status: "open", paper_trade: true, entry_mode: "clob_network_fallback",
          reason: `CLOB network error — saved as paper fallback: ${(clobErr as Error).message}`,
        },
        { single: true },
      );
      
      return NextResponse.json({
        success: false, mode: "clob_network_error", error: (clobErr as Error).message, trade: fallbackTrade
      }, { status: 502 });
    }
  });

export async function GET() {
  return NextResponse.json({ info: "POST to this endpoint to execute a market buy." });
}
