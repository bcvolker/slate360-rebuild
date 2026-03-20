"use client";

import React, { useState, useCallback } from "react";
import { HelpTip, StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";

interface LiveChecklist {
  walletConnected: boolean;
  polygonSelected: boolean;
  usdcFunded: boolean;
  signatureVerified: boolean;
  usdcApproved: boolean;
}

interface MarketLiveWalletTabProps {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chain: { id: number; name: string } | undefined;
  isConnecting: boolean;
  isApproving: boolean;
  waitingApproveReceipt: boolean;
  approveSuccess: boolean;
  usdcBalance: string | null;
  maticData: { formatted: string; symbol: string } | undefined;
  walletVerified: boolean;
  walletError: string;
  walletChoice: "metamask" | "coinbase" | "trust";
  setWalletChoice: (v: "metamask" | "coinbase" | "trust") => void;
  liveChecklist: LiveChecklist;
  handleConnectWallet: () => Promise<void>;
  handleApproveUsdc: () => void;
  disconnect: () => void;
  paperMode: boolean;
}

type ReadinessCheck = {
  id: string;
  label: string;
  passed: boolean;
  description: string;
};

function CheckRow({ check }: { check: ReadinessCheck }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
      check.passed 
        ? "bg-emerald-950/50 border-emerald-800" 
        : "bg-red-950/30 border-red-900"
    }`}>
      <span className="text-lg mt-0.5">{check.passed ? "✅" : "❌"}</span>
      <div>
        <p className={`text-sm font-medium ${check.passed ? "text-emerald-300" : "text-red-300"}`}>{check.label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{check.description}</p>
      </div>
    </div>
  );
}

export default function MarketLiveWalletTab({ onNavigate, paperMode, liveChecklist, walletSnapshot, system, onOpenAutomation, }: { onNavigate: (tabId: string) => void; paperMode: boolean; liveChecklist: any; walletSnapshot: any; system: any; onOpenAutomation: () => void; }) {
  address, isConnected, chain, isConnecting, isApproving,
  waitingApproveReceipt, approveSuccess, usdcBalance, maticData,
  walletVerified, walletError, walletChoice, setWalletChoice,
  liveChecklist, handleConnectWallet, handleApproveUsdc, disconnect,
  paperMode,
}: MarketLiveWalletTabProps) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const systemStatus = useMarketSystemStatus();

  const maticBalance = maticData ? parseFloat(maticData.formatted) : 0;
  const maticFormatted = maticData ? `${parseFloat(maticData.formatted).toFixed(4)} ${maticData.symbol}` : "—";
  const gasOk = maticBalance > 0.01;
  const networkOk = chain?.id === 137;

  const readinessChecks: ReadinessCheck[] = [
    { id: "wallet", label: "Wallet Connected", passed: liveChecklist.walletConnected, description: isConnected ? `Connected: ${address?.slice(0, 6)}…${address?.slice(-4)}` : "Connect a wallet to get started" },
    { id: "network", label: "Polygon Network", passed: networkOk, description: networkOk ? "Connected to Polygon mainnet" : `Current network: ${chain?.name ?? "none"} — switch to Polygon` },
    { id: "signature", label: "Signature Verified", passed: liveChecklist.signatureVerified, description: walletVerified ? "Identity confirmed" : "Sign a message to verify wallet ownership" },
    { id: "approval", label: "USDC Approved", passed: liveChecklist.usdcApproved, description: liveChecklist.usdcApproved ? "USDC spending approved" : "Approve USDC for Polymarket trading" },
    { id: "usdc", label: "USDC Funded", passed: liveChecklist.usdcFunded, description: liveChecklist.usdcFunded ? `Balance: $${usdcBalance}` : "Fund your wallet with USDC on Polygon" },
    { id: "gas", label: "Gas Reserve", passed: gasOk, description: gasOk ? `MATIC: ${maticFormatted}` : "Add POL/MATIC for transaction fees (need > 0.01)" },
    { id: "disclaimer", label: "Risk Disclaimer Acknowledged", passed: disclaimerAccepted, description: disclaimerAccepted ? "You understand the risks" : "Accept the risk disclaimer to continue" },
  ];

  const allPassed = readinessChecks.every((c) => c.passed);
  const passedCount = readinessChecks.filter((c) => c.passed).length;
  const blockers = readinessChecks.filter((c) => !c.passed);
  const serverLiveReady = systemStatus.system?.liveServerReady ?? false;
  const effectiveLiveReady = allPassed && serverLiveReady;

  const handleTestFlow = useCallback(async () => {
    setTestRunning(true);
    setTestResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const issues: string[] = [];
      if (!isConnected) issues.push("Wallet not connected");
      if (!networkOk) issues.push("Wrong network");
      if (!walletVerified) issues.push("Signature not verified");
      if (!liveChecklist.usdcApproved) issues.push("USDC not approved");
      if (!liveChecklist.usdcFunded) issues.push("No USDC balance");
      if (!gasOk) issues.push("Insufficient gas");
      if (issues.length > 0) {
        setTestResult(`${issues.length} issue(s): ${issues.join(", ")}`);
      } else if (!serverLiveReady) {
        setTestResult("Wallet checks passed, but backend status still reports live blockers. Keep using Practice mode until server readiness is green.");
      } else {
        setTestResult("Wallet checks and backend status are aligned for live readiness.");
      }
    } finally {
      setTestRunning(false);
    }
  }, [isConnected, networkOk, walletVerified, liveChecklist, gasOk, serverLiveReady]);

  return (
    <div className="space-y-5 text-slate-100">
      {/* Overall readiness */}
      <div className={`rounded-2xl border-2 p-5 ${
        effectiveLiveReady 
          ? "border-emerald-500/50 bg-emerald-950/30" 
          : "border-amber-500/50 bg-amber-950/30"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              {effectiveLiveReady ? "Live Setup Looks Ready" : "Setup Incomplete Or Server-Blocked"}
              <HelpTip content="All checks must be green before live trading can start" />
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {passedCount} of {readinessChecks.length} checks passed
            </p>
          </div>
          <StatusBadge status={effectiveLiveReady ? "connected" : "idle"} />
        </div>

        {!allPassed && blockers.length > 0 && (
          <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold uppercase mb-2">What's Missing</p>
            <ul className="space-y-1">
              {blockers.map((b) => (
                <li key={b.id} className="text-sm text-red-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {b.label}: {b.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <MarketSystemStatusCard
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
        title="Live-trading backend health"
      />

      {systemStatus.system && systemStatus.system.blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Live blockers from backend status</p>
          <div className="mt-2 space-y-1.5 text-sm">
            {systemStatus.system.blockers.slice(0, 4).map((blocker) => (
              <p key={blocker.code} className="text-amber-300">• {blocker.label}: {blocker.detail}</p>
            ))}
          </div>
        </div>
      )}

      {/* Wallet connect */}
      <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Wallet Connection</h3>
        {!isConnected ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["metamask", "coinbase", "trust"] as const).map((w) => (
                <button key={w} onClick={() => setWalletChoice(w)}
                  className={`flex-1 py-2 text-xs rounded-lg font-medium transition capitalize ${
                    walletChoice === w 
                      ? "bg-[#FF4D00] text-white" 
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}>
                  {w === "metamask" ? "MetaMask" : w === "coinbase" ? "Coinbase" : "Trust"}
                </button>
              ))}
            </div>
            <button onClick={handleConnectWallet} disabled={isConnecting}
              className="w-full bg-[#FF4D00] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-slate-200">{address?.slice(0, 10)}…{address?.slice(-8)}</p>
              <p className="text-xs text-slate-500">{chain?.name ?? "Unknown"} (Chain {chain?.id})</p>
            </div>
            <button onClick={disconnect} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-950 transition">
              Disconnect
            </button>
          </div>
        )}
        {walletError && <p className="text-xs text-red-400 bg-red-950/50 rounded-lg px-3 py-2 border border-red-900/50">{walletError}</p>}
      </div>

      {/* Balances + Gas */}
      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">USDC Balance</h4>
            <p className="text-2xl font-bold text-white">${usdcBalance ?? "0.00"}</p>
            <p className="text-xs text-slate-500 mt-1">Polygon USDC (bridged)</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Gas Reserve</h4>
            <p className={`text-2xl font-bold ${gasOk ? "text-emerald-400" : "text-red-400"}`}>{maticFormatted}</p>
            <p className="text-xs text-slate-500 mt-1">{gasOk ? "Sufficient for transactions" : "Add POL/MATIC for fees"}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isConnected && (
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Setup Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!walletVerified && (
              <button onClick={handleConnectWallet} disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                🔏 Verify Signature
              </button>
            )}
            {!liveChecklist.usdcApproved && (
              <button onClick={handleApproveUsdc} disabled={isApproving || waitingApproveReceipt}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {isApproving || waitingApproveReceipt ? "Approving…" : "🧾 Approve USDC"}
              </button>
            )}
            {approveSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1">✅ USDC approved</p>}
          </div>
        </div>
      )}

      {/* Readiness checklist */}
      <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1">
          Readiness Checklist
          <HelpTip content="All items must pass before live trading is enabled" />
        </h3>
        <div className="space-y-2">
          {readinessChecks.map((c) => <CheckRow key={c.id} check={c} />)}
        </div>
      </div>

      {/* Risk disclaimer */}
      {!disclaimerAccepted && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/50 p-5">
          <h4 className="text-sm font-bold text-amber-400 mb-2">Risk Disclaimer</h4>
          <p className="text-xs text-amber-300 mb-3">
            Live trading uses real funds. Direct actions and automation controls can place orders only when wallet and backend readiness checks pass.
            You can lose money, and past performance does not guarantee future results. Only use funds you can afford to lose.
          </p>
          <button onClick={() => setDisclaimerAccepted(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-6 rounded-xl text-sm transition">
            I Understand the Risks
          </button>
        </div>
      )}

      {/* Test flow */}
      <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1">
          Verify Setup
          <HelpTip content="Run a quick check to make sure everything is working before going live" />
        </h3>
        <button onClick={handleTestFlow} disabled={testRunning}
          className="bg-[#FF4D00] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition w-full">
          {testRunning ? "Running checks…" : "🧪 Run Verification Test"}
        </button>
        {testResult && (
          <p className={`text-sm rounded-lg px-4 py-3 border ${
            testResult.includes("aligned") || testResult.includes("passed") 
              ? "bg-emerald-950 border-emerald-800 text-emerald-300" 
              : "bg-red-950 border-red-900 text-red-300"
          }`}>
            {testResult}
          </p>
        )}
        {systemStatus.system && !systemStatus.system.liveServerReady && (
          <p className="text-xs text-amber-400">
            Server note: live infrastructure still has blocker(s). You can finish wallet setup now, but keep using Practice mode until backend status shows Live server ready.
          </p>
        )}
      </div>

      {paperMode && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/50 p-4 text-center">
          <p className="text-sm text-purple-300">
            You're in <strong>Practice Mode</strong>. Complete the checklist above and switch to real-money mode on the Overview tab to trade live.
          </p>
        </div>
      )}
    </div>
  );
}
