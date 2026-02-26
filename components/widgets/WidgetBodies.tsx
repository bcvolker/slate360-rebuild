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
  BarChart3,
  CheckCircle2,
  Cpu,
  Lightbulb,
  Loader2,
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
export function FinancialWidgetBody({ expanded = false }: { expanded?: boolean }) {
  return (
    <div
      className={[
        "rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100",
        "p-4 flex flex-col justify-center items-center flex-1",
        expanded ? "min-h-[200px]" : "",
      ].join(" ")}
    >
      <BarChart3 size={28} className="text-blue-300 mb-2" />
      <p className="text-xs text-blue-400 text-center">Portfolio budget overview and trends</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── *
 *  Calendar (placeholder until full implementation)
 * ─────────────────────────────────────────────────────────────── */
export function CalendarWidgetBody({
  events = [],
}: {
  events?: Array<{ title: string; date: string; color?: string }>;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1 space-y-2">
      <p className="text-xs text-gray-500">Upcoming milestones and deadlines.</p>
      {events.length === 0 ? (
        <p className="text-xs font-semibold text-gray-400">No upcoming events</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 4).map((ev, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ev.color ?? "#1E3A8A" }}
              />
              <span className="text-xs text-gray-700 truncate flex-1">{ev.title}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{ev.date}</span>
            </li>
          ))}
        </ul>
      )}
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
 *  Continue Working (placeholder until full implementation)
 * ─────────────────────────────────────────────────────────────── */
export function ContinueWidgetBody({
  items = [],
}: {
  items?: Array<{ title: string; subtitle: string; href?: string }>;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1">
      <p className="text-xs text-gray-500">Pick up where you left off.</p>
      {items.length === 0 ? (
        <p className="text-xs font-semibold text-gray-400 mt-2">No recent activity</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.slice(0, 3).map((it, i) => (
            <li key={i} className="text-xs text-gray-700 truncate">{it.title}</li>
          ))}
        </ul>
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
