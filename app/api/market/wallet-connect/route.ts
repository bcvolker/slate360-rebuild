/**
 * POST /api/market/wallet-connect
 *
 * Validates a wallet address and saves it to user_metadata.
 * The actual MetaMask/WalletConnect signing happens client-side
 * with wagmi — this endpoint just persists the connected address
 * and verifies the signature.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyMessage } from "viem";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { address, signature, message, action } = body;

    // Disconnect wallet
    if (action === "disconnect") {
      const currentConfig = user.user_metadata?.marketBotConfig ?? {};
      await supabase.auth.updateUser({
        data: {
          marketBotConfig: { ...currentConfig, walletAddress: null },
        },
      });
      return NextResponse.json({ ok: true, connected: false });
    }

    // Connect wallet — verify signature
    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: "address, signature, and message are required" },
        { status: 400 },
      );
    }

    // Verify the signature matches the claimed address
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 },
      );
    }

    // Save to user_metadata
    const currentConfig = user.user_metadata?.marketBotConfig ?? {};
    await supabase.auth.updateUser({
      data: {
        marketBotConfig: { ...currentConfig, walletAddress: address },
      },
    });

    return NextResponse.json({ ok: true, connected: true, address });
  } catch (err) {
    console.error("[api/market/wallet-connect]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connection failed" },
      { status: 500 },
    );
  }
}
