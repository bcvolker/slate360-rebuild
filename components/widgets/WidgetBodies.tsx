/**
 * ═══════════════════════════════════════════════════════════════
 * Shared Widget Body Components — SINGLE SOURCE OF TRUTH
 *
 * All widget body content lives here.  Both DashboardClient and
 * ProjectHub import from this file.  To update a widget's look or
 * behaviour, change it once here — both pages pick it up
 * automatically.
 *
 * Complex widgets that depend on page-level state (e.g. live
 * weather API, seat members) still render inline in their pages,
 * but they can be migrated here over time by accepting data as
 * props.
 * ═══════════════════════════════════════════════════════════════
 */
"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  DollarSign,
  Lightbulb,
  Loader2,
  MapPin,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

/* ── Common body class helper ─────────────────────────────────── */
const row = "flex items-center justify-between mb-2";
const bar = "h-2.5 rounded-full bg-gray-100 overflow-hidden";
const fill = "h-full rounded-full transition-all duration-700";

/* ─────────────────────────────────────────────────────────────── *
 *  Weather
 * ─────────────────────────────────────────────────────────────── */
export function WeatherWidgetBody({
  emoji = "☀️",
  tempF,
  condition = "Partly Cloudy",
  expanded = false,
}: {
  emoji?: string;
  tempF?: string | number;
  condition?: string;
  expanded?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100",
        "p-4 flex flex-col justify-center items-center gap-2 flex-1",
        expanded ? "min-h-[200px]" : "",
      ].join(" ")}
    >
      <span className="text-4xl">{emoji}</span>
      {tempF !== undefined && (
        <p className="text-xl font-black text-gray-900">{tempF}°F</p>
      )}
      <p className="text-xs text-gray-500">{condition}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Financial Snapshot
 * ─────────────────────────────────────────────────────────────── */
export function FinancialWidgetBody({
  totalBudget = 0,
  totalSpent = 0,
  changeOrders = 0,
  projectCount = 0,
  expanded = false,
}: {
  totalBudget?: number;
  totalSpent?: number;
  changeOrders?: number;
  projectCount?: number;
  expanded?: boolean;
}) {
  const fmtUsd = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const revised = totalBudget + changeOrders;
  const variance = revised - totalSpent;
  const isOver = variance < 0;

  if (totalBudget === 0) {
    return (
      <div className={["rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100", "p-4 flex flex-col justify-center items-center flex-1", expanded ? "min-h-[200px]" : ""].join(" ")}>
        <BarChart3 size={28} className="text-blue-300 mb-2" />
        <p className="text-xs text-blue-400 text-center">No budget data available yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 flex-1 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Budget</p>
          <p className="text-sm font-black text-gray-900">{fmtUsd(totalBudget)}</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Spent</p>
          <p className="text-sm font-black text-gray-900">{fmtUsd(totalSpent)}</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-gray-500">Spend Progress</span>
          <span className="text-[10px] font-bold text-gray-700">{pct}%</span>
        </div>
        <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">{isOver ? <TrendingDown size={12} className="text-red-500" /> : <TrendingUp size={12} className="text-emerald-500" />}<span className={`text-[10px] font-bold ${isOver ? "text-red-600" : "text-emerald-600"}`}>{isOver ? "Over" : "Under"} {fmtUsd(Math.abs(variance))}</span></div>
        {projectCount > 0 && <span className="text-[9px] text-gray-400">{projectCount} project{projectCount !== 1 ? "s" : ""}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Calendar
 * ─────────────────────────────────────────────────────────────── */
export function CalendarWidgetBody({
  events = [],
}: {
  events?: Array<{ title: string; date: string; color?: string; status?: string }>;
}) {
  const today = new Date();
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter((e) => new Date(e.date) >= new Date(today.toDateString()));
  const display = upcoming.length > 0 ? upcoming : sorted;

  if (display.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-xs font-semibold text-gray-400">No upcoming events</p>
        <p className="text-[10px] text-gray-400">Tasks with due dates will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex-1 space-y-1.5">
      {display.slice(0, 5).map((ev, i) => {
        const d = new Date(ev.date);
        const isToday = d.toDateString() === today.toDateString();
        const isPast = d < today && !isToday;
        return (
          <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isToday ? "bg-[#FF4D00]/10 border border-[#FF4D00]/20" : isPast ? "opacity-50" : "bg-white border border-gray-100"}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color ?? (isToday ? "#FF4D00" : "#1E3A8A") }} />
            <span className="text-xs text-gray-700 truncate flex-1">{ev.title}</span>
            <span className={`text-[9px] font-bold shrink-0 ${isToday ? "text-[#FF4D00]" : "text-gray-400"}`}>{isToday ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Contacts (placeholder until full implementation)
 * ─────────────────────────────────────────────────────────────── */
export function ContactsWidgetBody({
  count = 0,
}: {
  count?: number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1">
      <p className="text-xs text-gray-500">Quick access to team and external contacts.</p>
      <p className="text-xs font-semibold text-gray-400 mt-2">{count} contacts</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Continue Working
 * ─────────────────────────────────────────────────────────────── */
export function ContinueWidgetBody({
  items = [],
}: {
  items?: Array<{ title: string; subtitle: string; href?: string; icon?: string }>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-xs font-semibold text-gray-400">No recent activity</p>
        <p className="text-[10px] text-gray-400">Open a project to start tracking</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-2 flex-1 space-y-1.5">
      {items.slice(0, 4).map((it, i) => (
        it.href ? (
          <a key={i} href={it.href} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 hover:border-[#FF4D00]/30 hover:bg-orange-50/30 transition group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{it.title}</p>
              <p className="text-[9px] text-gray-400 truncate">{it.subtitle}</p>
            </div>
            <ChevronRight size={12} className="shrink-0 text-gray-300 group-hover:text-[#FF4D00] transition" />
          </a>
        ) : (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{it.title}</p>
              <p className="text-[9px] text-gray-400 truncate">{it.subtitle}</p>
            </div>
            <ArrowUpRight size={12} className="shrink-0 text-gray-300" />
          </div>
        )
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Project Info
 * ─────────────────────────────────────────────────────────────── */
export function ProjectInfoWidgetBody({
  projectName,
  projectAddress,
  status,
  contractAmount,
  teamCount,
  expanded = false,
}: {
  projectName?: string;
  projectAddress?: string;
  status?: string;
  contractAmount?: number;
  teamCount?: number;
  expanded?: boolean;
}) {
  const fmtUsd = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
  const statusColor: Record<string, string> = { Active: "text-emerald-600 bg-emerald-50", "On Hold": "text-amber-600 bg-amber-50", Completed: "text-blue-600 bg-blue-50", Planning: "text-purple-600 bg-purple-50" };

  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 p-4 flex-1 space-y-3">
      {projectName ? (
        <>
          <div className="flex items-start gap-2">
            <Building2 size={16} className="text-[#1E3A8A] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{projectName}</p>
              {projectAddress && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={9} />{projectAddress}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {status && <div className="bg-white/70 rounded-lg px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Status</p><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor[status] ?? "text-gray-600 bg-gray-100"}`}>{status}</span></div>}
            {contractAmount !== undefined && contractAmount > 0 && <div className="bg-white/70 rounded-lg px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Contract</p><p className="text-xs font-black text-gray-800 flex items-center gap-0.5"><DollarSign size={10} />{fmtUsd(contractAmount)}</p></div>}
            {teamCount !== undefined && <div className="bg-white/70 rounded-lg px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Team</p><p className="text-xs font-black text-gray-800 flex items-center gap-1"><Users size={10} />{teamCount}</p></div>}
          </div>
        </>
      ) : (
        <div className={["flex flex-col items-center justify-center gap-2", expanded ? "min-h-[160px]" : ""].join(" ")}>
          <Building2 size={24} className="text-slate-300" />
          <p className="text-xs font-semibold text-gray-400">No project selected</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Processing Jobs
 * ─────────────────────────────────────────────────────────────── */
export function ProcessingWidgetBody({
  jobs = [],
}: {
  jobs?: Array<{
    id: string;
    name: string;
    type: string;
    progress: number;
    status: "completed" | "processing" | "queued" | "failed";
  }>;
}) {
  const statusColor: Record<string, string> = {
    completed: "text-emerald-600 bg-emerald-50",
    processing: "text-amber-600 bg-amber-50",
    queued: "text-blue-600 bg-blue-50",
    failed: "text-red-600 bg-red-50",
  };

  if (jobs.length === 0) {
    return (
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Cpu size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900">No active jobs</p>
            <p className="text-[10px] text-gray-400">Start from Design Studio or Content Studio</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 flex-1">
      {jobs.slice(0, 3).map((job) => (
        <div key={job.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-900 truncate flex-1 mr-2">{job.name}</p>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${statusColor[job.status] ?? ""}`}
            >
              {job.status}
            </span>
          </div>
          {job.status === "processing" && (
            <div className={bar}>
              <div className={fill} style={{ width: `${job.progress}%`, backgroundColor: "#FF4D00" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Suggest a Feature  (fully interactive, self-contained)
 * ─────────────────────────────────────────────────────────────── */
export function SuggestWidgetBody({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) return;
    setSubmitting(true);
    try {
      await fetch("/api/suggest-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, description: body.trim() }),
      });
      setDone(true);
    } catch {
      // silently ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-4 gap-2">
        <CheckCircle2 size={28} className="text-emerald-500" />
        <p className="text-xs font-semibold text-gray-900">Thank you!</p>
        <p className="text-[10px] text-gray-400">Your suggestion has been sent to our team.</p>
        <button
          onClick={() => { setDone(false); setTitle(""); setBody(""); }}
          className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 flex-1">
      <p className="text-xs text-gray-500">Have an idea? Help us build the features you need.</p>
      {expanded && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Feature title…"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your idea…"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] outline-none resize-none"
          />
        </>
      )}
      <button
        onClick={handleSubmit}
        disabled={submitting || (expanded && !title.trim())}
        className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-50 transition-all"
      >
        {submitting ? (
          <Loader2 size={13} className="inline mr-1.5 animate-spin" />
        ) : (
          <Lightbulb size={13} className="inline mr-1.5" />
        )}
        {submitting ? "Sending…" : "Submit Suggestion"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Data Usage & Credits
 * ─────────────────────────────────────────────────────────────── */
export function DataUsageWidgetBody({
  creditsUsed = 0,
  creditsMax = 100,
  storageUsedGb = 0,
  storageLimitGb = 50,
  planLabel,
}: {
  creditsUsed?: number;
  creditsMax?: number;
  storageUsedGb?: number;
  storageLimitGb?: number;
  planLabel?: string;
}) {
  const creditPct = Math.min((creditsUsed / Math.max(creditsMax, 1)) * 100, 100);
  const storagePct = Math.min((storageUsedGb / Math.max(storageLimitGb, 1)) * 100, 100);
  const creditDanger = creditPct > 85;

  return (
    <div className="space-y-5 flex-1">
      <div>
        <div className={row}>
          <span className="text-xs text-gray-500 font-medium">Credits used</span>
          <span className="text-xs font-bold text-gray-900">
            {creditsUsed.toLocaleString()} / {creditsMax.toLocaleString()}
          </span>
        </div>
        <div className={bar}>
          <div
            className={fill}
            style={{ width: `${creditPct}%`, backgroundColor: creditDanger ? "#EF4444" : "#FF4D00" }}
          />
        </div>
        {planLabel && (
          <p className="text-[10px] text-gray-400 mt-1">{planLabel} plan</p>
        )}
      </div>
      <div>
        <div className={row}>
          <span className="text-xs text-gray-500 font-medium">Storage</span>
          <span className="text-xs font-bold text-gray-900">
            {storageUsedGb.toFixed(1)} GB / {storageLimitGb} GB
          </span>
        </div>
        <div className={bar}>
          <div className={fill} style={{ width: `${storagePct}%`, backgroundColor: "#1E3A8A" }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {(storageLimitGb - storageUsedGb).toFixed(1)} GB available
        </p>
      </div>
    </div>
  );
}
