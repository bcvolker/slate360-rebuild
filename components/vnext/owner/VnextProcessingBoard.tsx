"use client";

import { useMemo, useState } from "react";
import { filterProcessingRows, type ProcessingFilter, type ProcessingRow } from "@/lib/vnext/ops/processing-model";

const FILTERS: Array<{ id: ProcessingFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "failed", label: "Failed" },
  { id: "completed", label: "Completed" },
];

export function VnextProcessingBoard({ rows, error }: { rows: ProcessingRow[]; error: string | null }) {
  const [filter, setFilter] = useState<ProcessingFilter>("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterProcessingRows(rows, filter, query), [rows, filter, query]);
  const running = visible.filter((row) => row.status === "queued" || row.status === "processing");
  const failed = visible.filter((row) => row.status === "failed");
  const completed = visible.filter((row) => row.status === "completed");
  return (
    <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-processing="true">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Processing</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className="inline-flex h-11 min-w-11 items-center justify-center border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-processing-filter={item.id} aria-pressed={filter === item.id}>
            {item.label}
          </button>
        ))}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Project or source" className="h-11 min-w-40 border border-[var(--vnext-line)] bg-white px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" aria-label="Search projects" />
      </div>
      {error ? <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-processing-error="true">{error}</p> : null}
      {!error && rows.length === 0 ? <p className="mt-6 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">Nothing is processing right now.</p> : null}
      <Section title="Running" rows={running} />
      <Section title="Failed" rows={failed} />
      <Section title="Recently completed" rows={completed} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: ProcessingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="m-0 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">{title}</h2>
      <ul className="m-0 list-none p-0">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-[var(--vnext-line)] py-3" data-vnext-processing-row={row.id}>
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{row.projectName} · {row.source}</p>
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
              {row.kind} · {row.stage ?? row.statusLabel} · {row.statusLabel}
              {row.progressPct != null ? ` · ${row.progressPct}% complete` : ""}
            </p>
            {row.error ? <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{row.error}</p> : null}
            {row.output ? <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">{row.output}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
