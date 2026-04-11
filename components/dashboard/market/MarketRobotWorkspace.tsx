"use client";

import React from "react";
import MarketMarketsSection from "./MarketMarketsSection";
import MarketOperatorRail from "./MarketOperatorRail";
import type { MarketShellContext } from "./MarketRouteShell";
import type { UseMarketBotReturn } from "@/lib/hooks/useMarketBot";
import { useMarketWalletState } from "@/lib/hooks/useMarketWalletState";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";
import { useMarketServerStatus } from "@/lib/hooks/useMarketServerStatus";

type MarketRobotWorkspaceProps = {
  layoutPrefs?: MarketShellContext;
  bot: UseMarketBotReturn;
  wallet: ReturnType<typeof useMarketWalletState>;
  systemStatus: ReturnType<typeof useMarketSystemStatus>;
  serverStatus: ReturnType<typeof useMarketServerStatus>;
  onTradePlaced: () => void;
  onOpenAutomation: () => void;
  onNavigate: (tab: string) => void;
  openPositionsCount?: number;
};

export default function MarketRobotWorkspace({
  layoutPrefs,
  bot,
  wallet,
  systemStatus,
  serverStatus,
  onTradePlaced,
  onOpenAutomation,
  onNavigate,
  openPositionsCount = 0,
}: MarketRobotWorkspaceProps) {
  const walletSnapshot = {
    address: wallet.address,
    isConnected: wallet.isConnected,
    usdcBalance: wallet.usdcBalance,
    maticFormatted: wallet.maticData 
      ? `${(Number(wallet.maticData.value) / 10 ** wallet.maticData.decimals).toFixed(4)} ${wallet.maticData.symbol}` 
      : "—",
    walletVerified: wallet.walletVerified,
    liveChecklist: wallet.liveChecklist,
  };

  const isPracticeMode = bot.config.paperMode;

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col bg-zinc-950">
      <div className="flex flex-1 overflow-hidden border-t border-zinc-800">
        {/* MAIN TRADING WORKSPACE - Dominant Search Area */}
        <div className="flex-1 overflow-auto bg-zinc-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                isPracticeMode 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "bg-rose-500/10 text-rose-400"
              }`}>
                {isPracticeMode ? "PRACTICE MODE" : "LIVE MODE"}
              </div>
              <span className="text-slate-400 text-sm">Market Search</span>
            </div>
          </div>

          <MarketMarketsSection
            onNavigate={onNavigate}
            paperMode={bot.config.paperMode}
            liveChecklist={wallet.liveChecklist}
            onTradePlaced={onTradePlaced}
            onOpenAutomation={onOpenAutomation}
          />
        </div>

        {/* STRENGTHENED OPERATOR RAIL — hidden on mobile, sidebar on md+ */}
        <div className="hidden md:block w-80 shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-auto">
          <MarketOperatorRail
            walletSnapshot={walletSnapshot}
            system={systemStatus.system}
            serverStatus={serverStatus.status}
            activityLogs={[]}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}
