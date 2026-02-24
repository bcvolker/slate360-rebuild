"use client";

import { useEffect, useMemo } from "react";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const SCOPES: Array<{ id: AnalyticsScope; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "tours", label: "Tours" },
  { id: "media", label: "Media" },
  { id: "workspace", label: "Workspace" },
];

export default function AnalyticsReportsClient({ tierLabel }: { tierLabel: string }) {
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
    datasets: [
      {
        label: "Monthly Events",
        data: [
          Math.max(1, Math.round((metrics?.totalProjects ?? 0) * 1.8)),
          Math.max(1, Math.round((metrics?.activeTours ?? 0) * 2.2)),
          Math.max(1, Math.round((metrics?.mediaAssets ?? 0) / 4)),
          Math.max(1, Math.round((metrics?.monthlyViews ?? 0) / 120)),
        ],
        backgroundColor: ["#FF6B35", "#3B82F6", "#1D4ED8", "#F97316"],
        borderRadius: 8,
      },
    ],
  }), [metrics]);

  const doughnutData = useMemo(() => {
    const used = metrics?.storageUsedGb ?? 0;
    const limit = metrics?.storageLimitGb ?? 1;
    const remaining = Math.max(limit - used, 0);
    return {
      labels: ["Used", "Remaining"],
      datasets: [
        {
          data: [used, remaining],
          backgroundColor: ["#FF6B35", "#1E3A8A"],
          borderWidth: 0,
        },
      ],
    };
  }, [metrics]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#0B1220] text-slate-100 min-h-screen">
      <header className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Analytics & Reports</p>
            <h1 className="text-2xl font-black text-white">Performance Command View</h1>
            <p className="mt-1 text-sm text-slate-300">Tier: {tierLabel} · Scope-specific insights and report exports.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0F172A] p-1">
            {SCOPES.map((item) => (
              <button
                key={item.id}
                onClick={() => setScope(item.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  scope === item.id
                    ? "bg-[#FF6B35] text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Projects</p>
          <p className="mt-1 text-2xl font-black text-white">{metrics?.totalProjects ?? "--"}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Storage Used</p>
          <p className="mt-1 text-2xl font-black text-white">{metrics ? `${metrics.storageUsedGb} GB` : "--"}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Monthly Views</p>
          <p className="mt-1 text-2xl font-black text-white">{metrics?.monthlyViews?.toLocaleString() ?? "--"}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <BarChart3 size={16} className="text-[#FF6B35]" /> Project Activity
          </div>
          <div className="h-72">
            {loading.summary ? (
              <div className="flex h-full items-center justify-center text-slate-300"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chart...</div>
            ) : (
              <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#CBD5E1" } } }, scales: { x: { ticks: { color: "#94A3B8" } }, y: { ticks: { color: "#94A3B8" } } } }} />
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PieChart size={16} className="text-[#3B82F6]" /> Storage Usage
          </div>
          <div className="h-72">
            {loading.summary ? (
              <div className="flex h-full items-center justify-center text-slate-300"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chart...</div>
            ) : (
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#CBD5E1" } } } }} />
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers size={16} className="text-[#FF6B35]" /> Reports
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void requestExport("pdf", scope)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Download size={12} /> Export PDF
              </button>
              <button
                onClick={() => void requestExport("csv", scope)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <FileSpreadsheet size={12} /> Export CSV
              </button>
            </div>
          </div>
          {loading.reports ? (
            <div className="text-sm text-slate-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading reports...</div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2">
                  <p className="text-sm font-semibold text-slate-100">{report.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(report.createdAt).toLocaleString()} · {report.status}</p>
                </div>
              ))}
            </div>
          )}
          {exportState.url && (
            <p className="mt-3 text-xs text-emerald-300">Mock export ready: {exportState.url}</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-[#121A2B] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Brain size={16} className="text-[#3B82F6]" /> AI Insight
          </h2>
          <button
            onClick={() => void generateInsight(scope)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1B316E]"
            disabled={loading.insight}
          >
            {loading.insight ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            Generate AI Insight
          </button>
          <div className="mt-4 rounded-lg border border-slate-700 bg-[#0F172A] p-3 text-sm text-slate-200 min-h-28">
            {insightText || "Click \"Generate AI Insight\" to create a scope-based recommendation."}
          </div>
        </article>
      </section>
    </main>
  );
}
