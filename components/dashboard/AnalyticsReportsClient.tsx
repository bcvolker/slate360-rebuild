"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Brain,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  PieChart,
} from "lucide-react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useAnalyticsStore, type AnalyticsScope } from "@/src/lib/useAnalyticsStore";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import type { Tier } from "@/lib/entitlements";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const SCOPES: Array<{ id: AnalyticsScope; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "tours", label: "Tours" },
  { id: "media", label: "Media" },
  { id: "workspace", label: "Workspace" },
];

interface AnalyticsProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
}

export default function AnalyticsReportsClient({ user, tier, isCeo = false }: AnalyticsProps) {
  const {
    scope,
    metrics,
    reports,
    insightText,
    loading,
    exportState,
    error,
    setScope,
    fetchSummary,
    fetchReports,
    generateInsight,
    requestExport,
  } = useAnalyticsStore();

  useEffect(() => {
    void fetchSummary(scope);
    void fetchReports(scope);
  }, [scope, fetchSummary, fetchReports]);

  const barData = useMemo(() => ({
    labels: ["Project Activity", "Tour Engagement", "Media Ops", "Workspace Visits"],
    datasets: [{
      label: "Monthly Events",
      data: [
        Math.max(1, Math.round((metrics?.totalProjects ?? 0) * 1.8)),
        Math.max(1, Math.round((metrics?.activeTours ?? 0) * 2.2)),
        Math.max(1, Math.round((metrics?.mediaAssets ?? 0) / 4)),
        Math.max(1, Math.round((metrics?.monthlyViews ?? 0) / 120)),
      ],
      backgroundColor: ["#FF6B35", "#3B82F6", "#1D4ED8", "#F97316"],
      borderRadius: 8,
    }],
  }), [metrics]);

  const doughnutData = useMemo(() => {
    const used = metrics?.storageUsedGb ?? 0;
    const limit = metrics?.storageLimitGb ?? 1;
    const remaining = Math.max(limit - used, 0);
    return {
      labels: ["Used", "Remaining"],
      datasets: [{ data: [used, remaining], backgroundColor: ["#FF6B35", "#1E3A8A"], borderWidth: 0 }],
    };
  }, [metrics]);

  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      title="Analytics & Reports"
      icon={BarChart3}
      accent="#1E3A8A"
      status="live"
      isCeo={isCeo}
    >
      {/* Scope header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Analytics &amp; Reports</p>
            <h2 className="text-2xl font-black text-gray-900">Performance Command View</h2>
            <p className="mt-1 text-sm text-gray-500">Scope-specific insights and report exports.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {SCOPES.map((item) => (
              <button
                key={item.id}
                onClick={() => setScope(item.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  scope === item.id ? "bg-[#FF4D00] text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* KPI cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Projects</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{metrics?.totalProjects ?? "--"}</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Storage Used</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{metrics ? `${metrics.storageUsedGb} GB` : "--"}</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Monthly Views</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{metrics?.monthlyViews?.toLocaleString() ?? "--"}</p>
        </article>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BarChart3 size={16} className="text-[#FF4D00]" /> Project Activity
          </div>
          <div className="h-72">
            {loading.summary ? (
              <div className="flex h-full items-center justify-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chart...</div>
            ) : (
              <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#374151" } } }, scales: { x: { ticks: { color: "#6B7280" } }, y: { ticks: { color: "#6B7280" } } } }} />
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <PieChart size={16} className="text-[#3B82F6]" /> Storage Usage
          </div>
          <div className="h-72">
            {loading.summary ? (
              <div className="flex h-full items-center justify-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chart...</div>
            ) : (
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#374151" } } } }} />
            )}
          </div>
        </article>
      </section>

      {/* Reports + AI Insight */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Layers size={16} className="text-[#FF4D00]" /> Reports
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => void requestExport("pdf", scope)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <Download size={12} /> Export PDF
              </button>
              <button onClick={() => void requestExport("csv", scope)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                <FileSpreadsheet size={12} /> Export CSV
              </button>
            </div>
          </div>
          {loading.reports ? (
            <div className="text-sm text-gray-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading reports...</div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()} · {report.status}</p>
                </div>
              ))}
            </div>
          )}
          {exportState.url && (
            <p className="mt-3 text-xs text-emerald-600">Mock export ready: {exportState.url}</p>
          )}
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Brain size={16} className="text-[#3B82F6]" /> AI Insight
          </h2>
          <button
            onClick={() => void generateInsight(scope)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162D69]"
            disabled={loading.insight}
          >
            {loading.insight ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            Generate AI Insight
          </button>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 min-h-28">
            {insightText || "Click \"Generate AI Insight\" to create a scope-based recommendation."}
          </div>
        </article>
      </section>
    </DashboardTabShell>
  );
}
