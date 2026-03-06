"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Download,
  FileText,
  Layers,
  Loader2,
  Plus,
  Send,
} from "lucide-react";
import { useAnalyticsStore } from "@/src/lib/useAnalyticsStore";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import type { Tier } from "@/lib/entitlements";

const REPORT_TYPES = [
  { id: "stakeholder-progress", label: "Stakeholder Progress Report", desc: "Overall project health, milestones, and key updates for clients and owners." },
  { id: "rfi-summary",          label: "RFI Summary",                  desc: "Open, closed, and pending RFIs with response times and responsible parties." },
  { id: "budget-review",        label: "Budget Review",                desc: "Committed costs, forecasts, change orders, and budget vs. actual variance." },
  { id: "photo-log",            label: "Photo Log Report",             desc: "Dated progress photos organized by area, trade, or milestone." },
  { id: "submittal-log",        label: "Submittal Log",                desc: "Full submittal register with status, review cycles, and approval dates." },
  { id: "custom",               label: "Custom Report",                desc: "Choose specific data sections and arrange them to suite your needs." },
];

const DATA_SECTIONS = [
  { id: "overview",    label: "Project Overview & Details" },
  { id: "schedule",   label: "Schedule Status" },
  { id: "rfi",        label: "RFI Register" },
  { id: "submittal",  label: "Submittal Log" },
  { id: "budget",     label: "Budget & Cost Summary" },
  { id: "daily-logs", label: "Daily Log Entries" },
  { id: "punch-list", label: "Punch List" },
  { id: "observations", label: "Observations Log" },
  { id: "contracts",  label: "Contracts" },
  { id: "team",       label: "Team & Contacts" },
  { id: "activity",   label: "Recent Activity" },
];

type ProjectOption = { id: string; name: string; status: string; address: string | null };

const DATE_RANGES = [
  { value: "last-7",    label: "Last 7 days" },
  { value: "last-30",   label: "Last 30 days" },
  { value: "last-90",   label: "Last 90 days" },
  { value: "this-year", label: "This year" },
  { value: "all-time",  label: "All time" },
];

interface AnalyticsProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  internalAccess?: { ceo?: boolean; market?: boolean; athlete360?: boolean };
}

export default function AnalyticsReportsClient({ user, tier, isCeo = false, internalAccess }: AnalyticsProps) {
  const { reports, loading, exportState, error, fetchReports, requestExport } = useAnalyticsStore();

  const [selectedType, setSelectedType]         = useState(REPORT_TYPES[0].id);
  const [selectedSections, setSelectedSections] = useState<string[]>(DATA_SECTIONS.slice(0, 6).map((s) => s.id));
  const [dateRange, setDateRange]               = useState("last-30");
  const [building, setBuilding]                 = useState(false);
  const [typeOpen, setTypeOpen]                 = useState(false);
  const [projects, setProjects]                 = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectsLoading, setProjectsLoading]   = useState(false);

  useEffect(() => { void fetchReports("projects"); }, [fetchReports]);

  useEffect(() => {
    setProjectsLoading(true);
    fetch("/api/analytics/projects")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.projects ?? []) as ProjectOption[];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id);
      })
      .catch(() => null)
      .finally(() => setProjectsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTypeObj = REPORT_TYPES.find((t) => t.id === selectedType) ?? REPORT_TYPES[0];
  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);

  const toggleSection = (id: string) =>
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleBuild = async () => {
    if (!selectedProjectId) return;
    setBuilding(true);
    // Fire real data fetch so the UI shows the data summary then request export
    await fetch(
      `/api/analytics/project-data?projectId=${selectedProjectId}&sections=${selectedSections.join(",")}&dateRange=${dateRange}`
    );
    await requestExport("pdf", "projects");
    setBuilding(false);
  };

  return (
    <DashboardTabShell
      user={user}
      tier={tier}
      title="Analytics & Reports"
      icon={BarChart3}
      accent="#1E3A8A"
      status="live"
      isCeo={isCeo}
      internalAccess={internalAccess}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Report Builder ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-black text-gray-900">Build a Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pull data from your projects and generate a professional report to share with stakeholders. Built reports are stored in the Saved Reports section below.
          </p>
        </div>

        {/* Project selector */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Project</label>
          {projectsLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-gray-400"><Loader2 size={13} className="animate-spin" /> Loading projects…</div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects found. Create a project in Project Hub first.</p>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.address ? ` — ${p.address}` : ""} ({p.status})
                </option>
              ))}
            </select>
          )}
          {selectedProjectObj && (
            <p className="mt-1 text-xs text-gray-400">
              Data from all sections will be pulled from this project and filtered by the date range below.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          {/* Report type picker */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Report Type</label>
            <div className="relative">
              <button
                onClick={() => setTypeOpen(!typeOpen)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors"
              >
                {selectedTypeObj.label}
                <ChevronDown size={14} className="shrink-0 text-gray-400" />
              </button>
              {typeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTypeOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl">
                    {REPORT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedType(t.id); setTypeOpen(false); }}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selectedType === t.id ? "bg-[#FF4D00]/5" : ""}`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Build button */}
          <div className="flex items-end">
            <button
              onClick={() => void handleBuild()}
              disabled={building || selectedSections.length === 0 || !selectedProjectId}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#FF4D00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E04400] disabled:opacity-50 transition-colors"
            >
              {building ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Build Report
            </button>
          </div>
        </div>

        {/* Data sections selector */}
        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Include Data Sections <span className="normal-case font-normal text-gray-400">({selectedSections.length} selected)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DATA_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSection(s.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedSections.includes(s.id)
                    ? "border-[#1E3A8A] bg-[#1E3A8A]/5 text-[#1E3A8A]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {exportState.url && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <FileText size={16} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">Report ready —</p>
            <a href={exportState.url} className="text-sm text-emerald-600 underline">Download PDF</a>
          </div>
        )}
      </section>

      {/* ── Saved Reports ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
            <Layers size={15} className="text-[#FF4D00]" /> Saved Reports
          </h2>
          <button
            onClick={() => void requestExport("csv", "projects")}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={12} /> Export All (CSV)
          </button>
        </div>

        {loading.reports ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <FileText size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">No reports yet</p>
            <p className="mt-1 text-xs text-gray-400">Build your first report above — it will appear here once generated.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{report.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    &nbsp;·&nbsp;{report.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void requestExport("pdf", "projects")}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={11} /> PDF
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Send size={11} /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardTabShell>
  );
}

