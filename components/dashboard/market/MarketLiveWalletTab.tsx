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
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${check.passed ? "bg-green-50" : "bg-red-50"}`}>
      <span className="text-lg mt-0.5">{check.passed ? "✅" : "❌"}</span>
      <div>
        <p className={`text-sm font-medium ${check.passed ? "text-green-800" : "text-red-800"}`}>{check.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
      </div>
    </div>
  );
}

export default function MarketLiveWalletTab({
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
      // Simulate checking all systems
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
    <div className="space-y-5">
      {/* Overall readiness */}
      <div className={`rounded-2xl border-2 p-5 ${effectiveLiveReady ? "border-green-300 bg-green-50/50" : "border-amber-300 bg-amber-50/50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {effectiveLiveReady ? "Live Setup Looks Ready" : "Setup Incomplete Or Server-Blocked"}
              <HelpTip content="All checks must be green before live trading can start" />
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {passedCount} of {readinessChecks.length} checks passed
            </p>
          </div>
          <StatusBadge status={effectiveLiveReady ? "connected" : "idle"} />
        </div>

        {!allPassed && blockers.length > 0 && (
          <div className="mt-3 bg-white rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">What&apos;s Missing</p>
            <ul className="space-y-1">
              {blockers.map((b) => (
                <li key={b.id} className="text-sm text-red-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {b.label}: {b.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Wallet connect */}
      <MarketSystemStatusCard
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
        title="Live-trading backend health"
      />
      {systemStatus.system && systemStatus.system.blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Live blockers from backend status</p>
          <div className="mt-2 space-y-1.5">
            {systemStatus.system.blockers.slice(0, 4).map((blocker) => (
              <p key={blocker.code} className="text-xs text-amber-800">• {blocker.label}: {blocker.detail}</p>
            ))}
          </div>
        </div>
      )}

      {/* Wallet connect */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Wallet Connection</h3>
        {!isConnected ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["metamask", "coinbase", "trust"] as const).map((w) => (
                <button key={w} onClick={() => setWalletChoice(w)}
                  className={`flex-1 py-2 text-xs rounded-lg font-medium transition capitalize ${walletChoice === w ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
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
              <p className="text-sm font-mono text-gray-800">{address?.slice(0, 10)}…{address?.slice(-8)}</p>
              <p className="text-xs text-gray-400">{chain?.name ?? "Unknown"} (Chain {chain?.id})</p>
            </div>
            <button onClick={disconnect} className="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition">
              Disconnect
            </button>
          </div>
        )}
        {walletError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{walletError}</p>}
      </div>

      {/* Balances + Gas */}
      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">USDC Balance</h4>
            <p className="text-2xl font-bold text-gray-900">${usdcBalance ?? "0.00"}</p>
            <p className="text-xs text-gray-400 mt-1">Polygon USDC (bridged)</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Gas Reserve</h4>
            <p className={`text-2xl font-bold ${gasOk ? "text-green-600" : "text-red-600"}`}>{maticFormatted}</p>
            <p className="text-xs text-gray-400 mt-1">{gasOk ? "Sufficient for transactions" : "Add POL/MATIC for fees"}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isConnected && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Setup Actions</h3>
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
            {approveSuccess && <p className="text-xs text-green-600 flex items-center gap-1">✅ USDC approved</p>}
          </div>
        </div>
      )}

      {/* Readiness checklist */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
          Readiness Checklist
          <HelpTip content="All items must pass before live trading is enabled" />
        </h3>
        <div className="space-y-2">
          {readinessChecks.map((c) => <CheckRow key={c.id} check={c} />)}
        </div>
      </div>

      {/* Risk disclaimer */}
      {!disclaimerAccepted && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-amber-800 mb-2">Risk Disclaimer</h4>
          <p className="text-xs text-amber-700 mb-3">
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
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
          Verify Setup
          <HelpTip content="Run a quick check to make sure everything is working before going live" />
        </h3>
        <button onClick={handleTestFlow} disabled={testRunning}
          className="bg-[#FF4D00] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition">
          {testRunning ? "Running checks…" : "🧪 Run Verification Test"}
        </button>
        {testResult && (
          <p className={`text-sm rounded-lg px-4 py-3 ${testResult.startsWith("All") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult}
          </p>
        )}
        {systemStatus.system && !systemStatus.system.liveServerReady && (
          <p className="text-xs text-amber-700">
            Server note: live infrastructure still has blocker(s). You can finish wallet setup now, but keep using Practice mode until backend status shows Live server ready.
          </p>
        )}
      </div>

      {/* Practice mode notice */}
      {paperMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-purple-700">
            You&apos;re in <strong>Practice Mode</strong>. Complete the checklist above and switch to real-money mode on the Overview tab to trade live.
          </p>
        </div>
      )}
    </div>
  );
}
