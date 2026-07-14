"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flag, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import type { MobileAppHomeAlert } from "@/lib/mobile/load-app-home-data";

type Filter = "all" | "flagged" | "todo";

/**
 * Personal Inbox triage — search + Open/Flagged/To-do filters, per rev 7
 * lock (Q3, corrected): flag/to-do are a lightweight personal layer,
 * deliberately separate from the formal GC verify-then-close state machine.
 * "Done for me" isn't a separate action here — assignments already drop out
 * via their formal status, alerts already drop out via is_read (both
 * pre-filtered server-side), so triage only needs flag + to-do.
 */
export function SW360InboxClient({
  assignments: initialAssignments,
  alerts: initialAlerts,
}: {
  assignments: MobileHomeAssignment[];
  alerts: MobileAppHomeAlert[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function toggleAssignment(id: string, field: "flagged" | "isTodo") {
    const current = assignments.find((a) => a.id === id);
    if (!current) return;
    const next = !current[field];
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: next } : a)));
    await fetch(`/api/site-walk/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field === "isTodo" ? "is_todo" : "flagged"]: next }),
    }).catch(() => {
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: !next } : a)));
    });
  }

  async function toggleAlert(id: string, field: "flagged" | "isTodo") {
    const current = alerts.find((a) => a.id === id);
    if (!current) return;
    const next = !current[field];
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: next } : a)));
    await fetch("/api/notifications/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field === "isTodo" ? "is_todo" : "flagged"]: next }),
    }).catch(() => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: !next } : a)));
    });
  }

  const q = query.trim().toLowerCase();
  const filteredAssignments = useMemo(
    () =>
      assignments.filter((a) => {
        if (filter === "flagged" && !a.flagged) return false;
        if (filter === "todo" && !a.isTodo) return false;
        if (q && !a.title.toLowerCase().includes(q)) return false;
        return true;
      }),
    [assignments, filter, q],
  );
  const filteredAlerts = useMemo(
    () =>
      alerts.filter((a) => {
        if (filter === "flagged" && !a.flagged) return false;
        if (filter === "todo" && !a.isTodo) return false;
        if (q && !a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q)) return false;
        return true;
      }),
    [alerts, filter, q],
  );

  const hasNothing = filteredAssignments.length === 0 && filteredAlerts.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Inbox"
        className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
      />

      <div className="flex gap-2">
        {(["all", "flagged", "todo"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wide",
              filter === f
                ? "bg-[var(--sw360-green-light)] text-white"
                : "border border-[var(--border)] text-[var(--sw360-charcoal)]/60",
            )}
          >
            {f === "all" ? "Open" : f === "flagged" ? "Flagged" : "To-do"}
          </button>
        ))}
      </div>

      {hasNothing ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-6 text-center">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Nothing here</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/60">
            {filter === "all" ? "Assigned items and updates will show up here." : "Try a different filter."}
          </p>
        </div>
      ) : null}

      {filteredAssignments.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Assigned to you
          </p>
          <div className="flex flex-col gap-2">
            {filteredAssignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                    {a.status}
                  </span>
                </div>
                <button type="button" onClick={() => void toggleAssignment(a.id, "isTodo")} aria-label="To-do">
                  <ListTodo
                    size={16}
                    className={a.isTodo ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/30"}
                  />
                </button>
                <button type="button" onClick={() => void toggleAssignment(a.id, "flagged")} aria-label="Flag">
                  <Flag
                    size={16}
                    className={a.flagged ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/30"}
                    fill={a.flagged ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {filteredAlerts.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Updates
          </p>
          <div className="flex flex-col gap-2">
            {filteredAlerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                {a.linkPath ? (
                  <Link href={a.linkPath} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                    <p className="truncate text-xs text-[var(--sw360-charcoal)]/60">{a.message}</p>
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                    <p className="truncate text-xs text-[var(--sw360-charcoal)]/60">{a.message}</p>
                  </div>
                )}
                <button type="button" onClick={() => void toggleAlert(a.id, "isTodo")} aria-label="To-do">
                  <ListTodo
                    size={16}
                    className={a.isTodo ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/30"}
                  />
                </button>
                <button type="button" onClick={() => void toggleAlert(a.id, "flagged")} aria-label="Flag">
                  <Flag
                    size={16}
                    className={a.flagged ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/30"}
                    fill={a.flagged ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
