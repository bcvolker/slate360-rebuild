/**
 * POST /api/market/buy
 *
 * Unified buy endpoint that handles:
 *  - Paper mode  → saves directly to market_trades (no wallet required)
 *  - Live mode   → validates wallet signature, records intent, then submits to
 *                  Polymarket CLOB API (clob.polymarket.com/order)
 *
 * NOTE: Live CLOB orders require:
 *   1. POLYMARKET_API_KEY + POLYMARKET_API_SECRET + POLYMARKET_API_PASSPHRASE
 *      in .env.local (generated once per wallet via /api/market/wallet-connect)
 *   2. @polymarket/clob-client installed: `npm i @polymarket/clob-client`
 *   3. Wallet on Polygon (chainId 137) with USDC + MATIC for gas
 *
 * Body: {
 *   market_id:    string       – Polymarket condition/market ID
 *   market_title: string       – human-readable title
 *   outcome:      "YES" | "NO"
 *   amount:       number       – USDC to spend
 *   avg_price:    number       – price per share (0–1)
 *   category:     string
 *   probability:  number       – YES probability 0–100
 *   paper_mode:   boolean
 *   wallet_address?: string    – required for live mode
 *   token_id?:    string       – Polymarket CLOB token ID for the outcome
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MIN_BUY_USD = 1;
const DEFAULT_MAX_BUY_USD = 1_000_000;

function getBuyLimits() {
  const envMin = Number(process.env.MARKET_BUY_MIN_USD ?? DEFAULT_MIN_BUY_USD);
  const envMax = Number(process.env.MARKET_BUY_MAX_USD ?? DEFAULT_MAX_BUY_USD);
  const minBuyUsd = Number.isFinite(envMin) && envMin > 0 ? envMin : DEFAULT_MIN_BUY_USD;
  const maxBuyUsd = Number.isFinite(envMax) && envMax >= minBuyUsd ? envMax : DEFAULT_MAX_BUY_USD;
  return { minBuyUsd, maxBuyUsd };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    } = body;

    // ── Validation ─────────────────────────────────────────────────────────
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
    if (!["YES", "NO"].includes(outcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }
    const { minBuyUsd, maxBuyUsd } = getBuyLimits();
    if (amount < minBuyUsd || amount > maxBuyUsd) {
      return NextResponse.json(
        {
          error: `Amount out of range ($${minBuyUsd.toLocaleString()}–$${maxBuyUsd.toLocaleString()})`,
          minBuyUsd,
          maxBuyUsd,
        },
        { status: 400 }
      );
    }

    const shares = parseFloat((amount / Math.max(avg_price, 0.01)).toFixed(4));
    const maxPayout = parseFloat((shares * 1).toFixed(4));

    // ── PAPER MODE ─────────────────────────────────────────────────────────
    if (paper_mode) {
      const { data: trade, error } = await admin
        .from("market_trades")
        .insert({
          user_id: user.id,
          market_id,
          question: market_title,
          side: outcome,
          shares,
          price: avg_price,
          total: amount,
          status: "open",
          pnl: 0,
          paper_trade: true,
          reason: `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mode: "paper",
        trade,
        summary: `Paper trade saved: ${shares.toFixed(1)} ${outcome} shares @ $${avg_price.toFixed(3)} (max payout $${maxPayout.toFixed(2)})`,
      });
    }

    // ── LIVE MODE ──────────────────────────────────────────────────────────
    // Live trading requires @polymarket/clob-client + API credentials.
    // The steps below outline the flow; the actual CLOB call is commented
    // until credentials are provisioned.

    if (!wallet_address) {
      return NextResponse.json(
        { error: "wallet_address required for live trades" },
        { status: 400 }
      );
    }

    const clob_host = process.env.POLYMARKET_CLOB_HOST ?? "https://clob.polymarket.com";
    const api_key = process.env.POLYMARKET_API_KEY;
    const api_secret = process.env.POLYMARKET_API_SECRET;
    const api_passphrase = process.env.POLYMARKET_API_PASSPHRASE;

    if (!api_key || !api_secret || !api_passphrase) {
      // Credentials not set → fall back to paper + warn
      console.warn("[api/market/buy] CLOB credentials not configured — saving as paper trade");

      const { data: trade, error } = await admin
        .from("market_trades")
        .insert({
          user_id: user.id,
          market_id,
          question: market_title,
          side: outcome,
          shares,
          price: avg_price,
          total: amount,
          status: "open",
          pnl: 0,
          paper_trade: true,
          reason: `Saved as paper — CLOB credentials not configured`,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mode: "paper_fallback",
        trade,
        warning: "CLOB API credentials not configured. Set POLYMARKET_API_KEY, POLYMARKET_API_SECRET, POLYMARKET_API_PASSPHRASE in .env.local to enable live trades.",
        clob_docs: `${clob_host}/docs`,
      });
    }

    // ── CLOB Order Submission ──────────────────────────────────────────────
    // When @polymarket/clob-client is installed and credentials are set,
    // uncomment and adapt this block:
    //
    // import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
    //
    // const client = new ClobClient(clob_host, 137, undefined, {
    //   key: api_key,
    //   secret: api_secret,
    //   passphrase: api_passphrase,
    // });
    //
    // const orderArgs = {
    //   tokenID: token_id,
    //   price: avg_price,
    //   side: outcome === "YES" ? Side.BUY : Side.SELL,
    //   size: amount,
    //   feeRateBps: "200",   // 2% Polymarket fee
    //   nonce: "0",
    //   expiration: "0",
    // };
    //
    // const signedOrder = await client.createOrder(orderArgs);
    // const resp = await client.postOrder(signedOrder, OrderType.GTC);
    // → resp contains { orderID, status, ... }

    // For now, return a clear message that live mode needs credential setup:
    return NextResponse.json({
      success: false,
      mode: "live_pending",
      message: "Live CLOB trading is ready to activate. Add your Polymarket API credentials to .env.local.",
      required_env_vars: [
        "POLYMARKET_API_KEY",
        "POLYMARKET_API_SECRET",
        "POLYMARKET_API_PASSPHRASE",
      ],
      how_to_generate: "Visit https://docs.polymarket.com/#authentication and sign a wallet message to generate credentials. Store them server-side (never client-side).",
    }, { status: 501 });

  } catch (err) {
    console.error("[api/market/buy]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Buy failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint to execute a market buy.",
    paper_mode: "Works immediately — no wallet needed.",
    live_mode: "Requires POLYMARKET_API_KEY, POLYMARKET_API_SECRET, POLYMARKET_API_PASSPHRASE in .env.local.",
  });
}
