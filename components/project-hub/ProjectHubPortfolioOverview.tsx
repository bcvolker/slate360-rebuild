"use client";

import { useState } from "react";
import { FolderKanban, ClipboardList, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import type { ProjectHubSummary } from "@/lib/types/project-hub";

type Props = {
  summary: ProjectHubSummary | null;
  summaryLoading: boolean;
  fallbackProjectsCount: number;
};

type MetricCard = {
  id: string;
  icon: typeof FolderKanban;
  bg: string;
  text: string;
  value: number;
  label: string;
  detail: string[];
};

export default function ProjectHubPortfolioOverview({
  summary,
  summaryLoading,
  fallbackProjectsCount,
}: Props) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const cards: MetricCard[] = [
    {
      id: "projects",
      icon: FolderKanban,
      bg: "bg-blue-50",
      text: "text-blue-600",
      value: summary?.totals.projects ?? fallbackProjectsCount,
      label: "Total Projects",
      detail: summary?.recentProjects?.length
        ? summary.recentProjects.map((project) => `${project.name} (${project.status})`)
        : ["No projects yet — click 'New Project' to get started"],
    },
    {
      id: "rfis",
      icon: ClipboardList,
      bg: "bg-orange-50",
      text: "text-[#FF4D00]",
      value: summary?.work.openRfis ?? 0,
      label: "Open RFIs",
      detail: [
        "Aggregated open RFIs across all accessible projects",
        "Use per-project RFI tabs for detailed routing",
      ],
    },
    {
      id: "submittals",
      icon: CheckCircle2,
      bg: "bg-purple-50",
      text: "text-purple-600",
      value: summary?.work.pendingSubmittals ?? 0,
      label: "Submittals",
      detail: [
        "Pending/submitted submittals across projects",
        "Review approvals in each project's Submittals tab",
      ],
    },
    {
      id: "tasks",
      icon: AlertTriangle,
      bg: "bg-red-50",
      text: "text-red-600",
      value: summary?.totals.onHoldProjects ?? 0,
      label: "On-Hold Projects",
      detail: [
        "Projects currently marked on-hold",
        "Re-activate from project settings when ready",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div className="col-span-2 md:col-span-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Portfolio Snapshot</p>
            <h2 className="text-base sm:text-lg font-black text-gray-900">Organization-level project health</h2>
          </div>
          <span className="text-[11px] font-semibold text-gray-500">
            {summaryLoading
              ? "Loading summary..."
              : `${summary?.totals.projects ?? fallbackProjectsCount} projects tracked`}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-blue-500">Active Projects</p>
            <p className="text-xl font-black text-blue-700 mt-1">{summary?.totals.activeProjects ?? 0}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-orange-500">Open RFIs</p>
            <p className="text-xl font-black text-orange-700 mt-1">{summary?.work.openRfis ?? 0}</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-purple-500">Pending Submittals</p>
            <p className="text-xl font-black text-purple-700 mt-1">{summary?.work.pendingSubmittals ?? 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Portfolio Budget</p>
            <p className="text-base sm:text-lg font-black text-emerald-700 mt-1">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(summary?.budget.totalBudget ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {cards.map(({ id, icon: SIcon, bg, text, value, label, detail }) => {
        const isOpen = expandedCard === id;
        return (
          <div key={label} className="flex flex-col">
            <button
              onClick={() => setExpandedCard(isOpen ? null : id)}
              className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left ${isOpen ? "border-gray-300 shadow-md" : "border-gray-100 hover:border-gray-200"}`}
            >
              <div className={`p-2.5 sm:p-3 ${bg} ${text} rounded-xl shrink-0`}>
                <SIcon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl sm:text-2xl font-black text-gray-900">{value}</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500">{label}</p>
              </div>
              <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-1.5 animate-in slide-in-from-top-1">
                {detail.map((entry, index) => (
                  <p key={`${id}-${index}`} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    {entry}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
