"use client";

import React from "react";
import type { Chain } from "viem";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { LiveChecklist } from "@/components/dashboard/market/types";

interface MarketWalletCardProps {
  isConnected: boolean;
  address: `0x${string}` | undefined;
  chain: Chain | undefined;
  usdcBalance: string | null;
  maticData: { value: bigint; decimals: number } | undefined;
  isConnecting: boolean;
  isApproving: boolean;
  waitingApproveReceipt: boolean;
  approveSuccess: boolean;
  walletVerified: boolean;
  walletChoice: string;
  liveChecklist: LiveChecklist;
  polymarketSpender: string;
  onConnect: () => void;
  onApproveUsdc: () => void;
  onDisconnect: () => void;
  onClearVerified: () => void;
}

export default function MarketWalletCard({
  isConnected, address, chain, usdcBalance, maticData,
  isConnecting, isApproving, waitingApproveReceipt, approveSuccess,
  walletVerified, walletChoice, liveChecklist, polymarketSpender,
  onConnect, onApproveUsdc, onDisconnect, onClearVerified,
}: MarketWalletCardProps) {
  const walletLabel =
    walletChoice === "coinbase" ? "Coinbase Wallet" :
    walletChoice === "trust" ? "Trust Wallet" : "MetaMask";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
      <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1">
        🦊 Wallet
        <HelpTip content="Connect MetaMask to trade live on Polymarket using real USDC. Paper mode works without a wallet." />
      </h3>

      {!isConnected ? (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Connect your wallet on Polygon to enable live trades. Paper mode doesn&apos;t require a wallet.
          </p>
          <button onClick={onConnect} disabled={isConnecting}
            className="w-full bg-[#1E3A8A] hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50">
            🔐 {isConnecting ? "Connecting…" : `Connect ${walletLabel}`}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Address</span>
            <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">USDC (Polygon)</span>
            {usdcBalance != null ? (
              <span className="font-mono text-xs text-green-600 font-semibold">${usdcBalance}</span>
            ) : (
              <a href={`https://polygonscan.com/address/${address}#tokentxns`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#1E3A8A] underline underline-offset-2">View on Polygonscan ↗</a>
            )}
          </div>
          {maticData && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">MATIC (gas)</span>
              <span className="font-mono text-xs text-gray-600">
                {(Number(maticData.value) / 10 ** maticData.decimals).toFixed(4)} MATIC
              </span>
            </div>
          )}
          {chain?.id !== 137 && (
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              ⚠️ Switch MetaMask to Polygon network to see balances
            </p>
          )}
          <div className="flex gap-1.5 pt-1">
            {!walletVerified ? (
              <button onClick={onConnect}
                className="flex-1 bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-2 rounded-lg font-bold transition">
                ✍️ Verify Sign
              </button>
            ) : (
              <span className="flex-1 text-center text-xs text-green-600 font-semibold py-2 bg-green-50 border border-green-200 rounded-lg">
                ✓ Verified
              </span>
            )}
            <button onClick={onApproveUsdc}
              disabled={isApproving || waitingApproveReceipt || !polymarketSpender}
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-lg font-bold transition disabled:opacity-50">
              {approveSuccess ? "✅ USDC Approved" : isApproving || waitingApproveReceipt ? "Approving…" : "Approve USDC"}
            </button>
            <a href="https://global.transak.com/?defaultCryptoCurrency=USDC&network=polygon"
              target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-lg font-bold transition">
              💳 Buy USDC
            </a>
            <button onClick={() => { onDisconnect(); onClearVerified(); }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">
              Disc.
            </button>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-[11px] text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700">Live mode checklist</p>
            <p>{liveChecklist.walletConnected ? "✅" : "⬜"} Wallet connected</p>
            <p>{liveChecklist.polygonSelected ? "✅" : "⬜"} Polygon network selected</p>
            <p>{liveChecklist.usdcFunded ? "✅" : "⬜"} USDC balance available</p>
            <p>{liveChecklist.signatureVerified ? "✅" : "⬜"} Signature verified</p>
            <p>{liveChecklist.usdcApproved ? "✅" : "⬜"} USDC approval completed</p>
            {!polymarketSpender && (
              <p className="text-amber-600">Set `NEXT_PUBLIC_POLYMARKET_SPENDER` to enable one-tap approval.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
