"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  FileText,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import type { ProjectHubSummary } from "@/lib/types/project-hub";

type Props = {
  summary: ProjectHubSummary | null;
  summaryLoading: boolean;
  fallbackProjectsCount: number;
};

type SnapshotCard = {
  id: string;
  icon: typeof FolderKanban;
  borderColor: string;
  bgColor: string;
  labelColor: string;
  valueColor: string;
  value: string | number;
  label: string;
  detail: string[];
  /** If set, navigates to the first matching project's tool tab */
  toolPath?: string;
};

export default function ProjectHubPortfolioOverview({
  summary,
  summaryLoading,
  fallbackProjectsCount,
}: Props) {
  const router = useRouter();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const firstProjectId = summary?.recentProjects?.[0]?.id;

  const navigateToTool = (toolPath?: string) => {
    if (!toolPath || !firstProjectId) return;
    router.push(`/project-hub/${firstProjectId}/${toolPath}`);
  };

  const cards: SnapshotCard[] = [
    {
      id: "active",
      icon: FolderKanban,
      borderColor: "border-blue-900/50",
      bgColor: "bg-blue-950/40",
      labelColor: "text-blue-400",
      valueColor: "text-blue-300",
      value: summary?.totals.activeProjects ?? 0,
      label: "Active Projects",
      detail: summary?.recentProjects?.length
        ? summary.recentProjects
            .filter((p) => p.status === "active")
            .slice(0, 5)
            .map((p) => p.name)
        : ["No active projects"],
    },
    {
      id: "rfis",
      icon: ClipboardList,
      borderColor: "border-orange-900/50",
      bgColor: "bg-orange-950/40",
      labelColor: "text-orange-400",
      valueColor: "text-orange-300",
      value: summary?.work.openRfis ?? 0,
      label: "Open RFIs",
      toolPath: "rfis",
      detail: [
        "Aggregated open RFIs across all projects",
        "Click to view RFIs for your most recent project",
      ],
    },
    {
      id: "submittals",
      icon: CheckCircle2,
      borderColor: "border-purple-900/50",
      bgColor: "bg-purple-950/40",
      labelColor: "text-purple-400",
      valueColor: "text-purple-300",
      value: summary?.work.pendingSubmittals ?? 0,
      label: "Pending Submittals",
      toolPath: "submittals",
      detail: [
        "Pending/submitted submittals across projects",
        "Click to review approvals in Submittals tab",
      ],
    },
    {
      id: "budget",
      icon: DollarSign,
      borderColor: "border-emerald-900/50",
      bgColor: "bg-emerald-950/40",
      labelColor: "text-emerald-400",
      valueColor: "text-emerald-300",
      value: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(summary?.budget.totalBudget ?? 0),
      label: "Portfolio Budget",
      toolPath: "budget",
      detail: [
        `Total spent: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(summary?.budget.totalSpent ?? 0)}`,
        `Change orders: ${summary?.budget.totalChangeOrders ?? 0}`,
        "Click to view budget details",
      ],
    },
    {
      id: "completed",
      icon: BarChart3,
      borderColor: "border-teal-900/50",
      bgColor: "bg-teal-950/40",
      labelColor: "text-teal-400",
      valueColor: "text-teal-300",
      value: summary?.totals.completedProjects ?? 0,
      label: "Completed",
      detail: summary?.recentProjects?.length
        ? summary.recentProjects
            .filter((p) => p.status === "completed")
            .slice(0, 5)
            .map((p) => p.name)
        : ["No completed projects yet"],
    },
    {
      id: "onhold",
      icon: AlertTriangle,
      borderColor: "border-red-900/50",
      bgColor: "bg-red-950/40",
      labelColor: "text-red-400",
      valueColor: "text-red-300",
      value: summary?.totals.onHoldProjects ?? 0,
      label: "On Hold",
      detail: [
        "Projects currently marked on-hold",
        "Re-activate from project settings when ready",
      ],
    },
    {
      id: "documents",
      icon: FileText,
      borderColor: "border-indigo-900/50",
      bgColor: "bg-indigo-950/40",
      labelColor: "text-indigo-400",
      valueColor: "text-indigo-300",
      value: summary?.totals.projects ?? fallbackProjectsCount,
      label: "Total Projects",
      toolPath: "documents",
      detail: summary?.recentProjects?.length
        ? summary.recentProjects.slice(0, 5).map((p) => `${p.name} (${p.status})`)
        : ["No projects yet — click New Project to get started"],
    },
  ];

  return (
    <div className="space-y-3">
      {/* Portfolio Snapshot header */}
      <div className="rounded-2xl border border-app bg-app-card px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">
              Portfolio Snapshot
            </p>
            <h2 className="text-base sm:text-lg font-black text-foreground">
              Organization-level project health
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400">
            {summaryLoading
              ? "Loading summary..."
              : `${summary?.totals.projects ?? fallbackProjectsCount} projects tracked`}
          </span>
        </div>

        {/* Interactive metric cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {cards.map((card) => {
            const isOpen = expandedCard === card.id;
            const hasLink = !!card.toolPath && !!firstProjectId;
            const Icon = card.icon;

            return (
              <div key={card.id} className="relative">
                <button
                  onClick={() => setExpandedCard(isOpen ? null : card.id)}
                  className={`w-full rounded-xl border ${card.borderColor} ${card.bgColor} p-3 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${
                    isOpen ? "ring-2 ring-zinc-600 shadow-md" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={13} className={card.labelColor} />
                    <ChevronDown
                      size={10}
                      className={`${card.labelColor} opacity-0 group-hover:opacity-100 transition-all ${
                        isOpen ? "rotate-180 opacity-100" : ""
                      }`}
                    />
                  </div>
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${card.labelColor} mt-1.5`}>
                    {card.label}
                  </p>
                  <p className={`text-lg sm:text-xl font-black ${card.valueColor} mt-0.5`}>
                    {card.value}
                  </p>
                </button>

                {/* Expanded detail dropdown */}
                {isOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white/[0.04] rounded-xl border border-app shadow-lg p-3 space-y-1.5 animate-in slide-in-from-top-1">
                    {card.detail.map((entry, idx) => (
                      <p
                        key={`${card.id}-${idx}`}
                        className="text-xs text-zinc-300 flex items-start gap-2"
                      >
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                        {entry}
                      </p>
                    ))}
                    {hasLink && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToTool(card.toolPath);
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-zinc-700 border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-600 transition-colors"
                      >
                        View Details <ArrowUpRight size={10} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
