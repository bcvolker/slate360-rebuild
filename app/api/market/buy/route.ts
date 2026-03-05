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
      // Credentials not configured → fall back to paper + warn
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
          token_id: token_id ?? null,
          reason: `Saved as paper — CLOB credentials not configured`,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        success: true,
        mode: "paper_fallback",
        trade,
        warning: "CLOB API credentials not configured. Set POLYMARKET_API_KEY, POLYMARKET_API_SECRET, POLYMARKET_API_PASSPHRASE in .env.local to enable live trades.",
      });
    }

    if (!token_id) {
      return NextResponse.json(
        { error: "token_id required for live trades — refresh the market listing and try again" },
        { status: 400 }
      );
    }

    // ── HMAC-signed CLOB order (no external package needed) ────────────────
    // Polymarket CLOB v2 API: POST /order
    // Auth: HMAC-SHA256 over (timestamp + "POST" + "/order" + body)
    // Docs: https://docs.polymarket.com/#create-order
    try {
      const { createHmac } = await import("crypto");

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const orderBody = {
        orderType: "GTC",
        tokenID: token_id,
        price: avg_price.toFixed(4),
        side: "BUY",
        size: amount.toFixed(2),
        feeRateBps: "200",
        nonce: "0",
        expiration: "0",
        makerAddress: wallet_address,
      };
      const bodyStr = JSON.stringify(orderBody);
      const message = timestamp + "POST" + "/order" + bodyStr;
      const secretBytes = Buffer.from(api_secret, "base64");
      const signature = createHmac("sha256", secretBytes)
        .update(message)
        .digest("base64");

      const clobRes = await fetch(`${clob_host}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "POLY_ADDRESS": wallet_address,
          "POLY-API-KEY": api_key,
          "POLY-SIGNATURE": signature,
          "POLY-TIMESTAMP": timestamp,
          "POLY-PASSPHRASE": api_passphrase,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(12_000),
      });

      const clobData = await clobRes.json() as Record<string, unknown>;

      if (!clobRes.ok) {
        // CLOB rejected — save as paper with error note
        const { data: trade } = await admin.from("market_trades").insert({
          user_id: user.id, market_id, question: market_title,
          side: outcome, shares, price: avg_price, total: amount,
          status: "open", pnl: 0, paper_trade: true, token_id: token_id ?? null,
          reason: `CLOB rejected (${clobRes.status}): ${JSON.stringify(clobData)}`,
        }).select().single();
        return NextResponse.json({
          success: false,
          mode: "clob_error",
          clob_status: clobRes.status,
          clob_response: clobData,
          trade,
        }, { status: 422 });
      }

      // ── CLOB accepted — save live trade record ──────────────────────────
      const clobOrderId = String(clobData.orderID ?? clobData.id ?? "");
      const { data: trade, error: insertError } = await admin
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
          paper_trade: false,
          token_id: token_id ?? null,
          clob_order_id: clobOrderId || null,
          reason: `Live CLOB order ${clobOrderId}`,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[api/market/buy] DB insert after CLOB success:", insertError);
      }

      return NextResponse.json({
        success: true,
        mode: "live",
        trade,
        clob_order_id: clobOrderId,
        summary: `Live order placed: ${shares.toFixed(1)} ${outcome} @ $${avg_price.toFixed(3)} (order ${clobOrderId})`,
      });
    } catch (clobErr) {
      console.error("[api/market/buy] CLOB submission error:", clobErr);
      // Network failure → save as paper
      const { data: trade } = await admin.from("market_trades").insert({
        user_id: user.id, market_id, question: market_title,
        side: outcome, shares, price: avg_price, total: amount,
        status: "open", pnl: 0, paper_trade: true, token_id: token_id ?? null,
        reason: `CLOB network error — saved as paper: ${(clobErr as Error).message}`,
      }).select().single();
      return NextResponse.json({
        success: false,
        mode: "clob_network_error",
        error: (clobErr as Error).message,
        trade,
      }, { status: 502 });
    }

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
    live_mode: "Requires POLYMARKET_API_KEY, POLYMARKET_API_SECRET, POLYMARKET_API_PASSPHRASE in .env.local. Submits via CLOB v2 HMAC auth.",
  });
}

