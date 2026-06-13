"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SEED_REPORT_TEMPLATES,
  emptyTemplate,
  type ReportSectionKey,
  type ThermalReportTemplate,
} from "@/lib/thermal/report-templates";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type SavedRow = { id: string; name: string; discipline: string; config: Record<string, unknown> };

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  cover: "Cover page",
  executive_summary: "Executive summary",
  methodology: "Methodology & standards",
  site_info: "Site / equipment info",
  findings: "Findings & anomalies",
  severity_table: "Severity table",
  recommendations: "Recommendations",
  disclaimer: "Disclaimer & limitations",
  signature: "Signature & credentials",
};

type Draft = Omit<ThermalReportTemplate, "id" | "is_seed">;

function toDraft(tpl: ThermalReportTemplate): Draft {
  const { id: _id, is_seed: _s, ...rest } = tpl;
  return JSON.parse(JSON.stringify(rest));
}

export function ThermalReportTemplateManager() {
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>(SEED_REPORT_TEMPLATES[0].id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(SEED_REPORT_TEMPLATES[0]));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSeed = selectedId.startsWith("seed-");

  const allOptions = useMemo(
    () => [
      ...SEED_REPORT_TEMPLATES.map((s) => ({ id: s.id, name: `★ ${s.name}` })),
      ...saved.map((s) => ({ id: s.id, name: s.name })),
    ],
    [saved],
  );

  async function refresh() {
    try {
      const res = await fetch("/api/ops/thermal/report-templates");
      if (!res.ok) return;
      const j = await res.json();
      setSaved((j.data?.templates ?? j.templates ?? []) as SavedRow[]);
    } catch {
      /* table may not be migrated yet — seeds still work */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function load(id: string) {
    setSelectedId(id);
    setNotice(null);
    setError(null);
    const seed = SEED_REPORT_TEMPLATES.find((s) => s.id === id);
    if (seed) return setDraft(toDraft(seed));
    const row = saved.find((s) => s.id === id);
    if (row) setDraft(toDraft({ id: row.id, ...(row.config as object) } as ThermalReportTemplate));
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function saveAsNew() {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/ops/thermal/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, discipline: draft.discipline, config: draft }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      await refresh();
      const id = j.data?.template?.id ?? j.template?.id;
      if (id) setSelectedId(id);
      setNotice("Saved as a new template.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpdate() {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/ops/thermal/report-templates/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, discipline: draft.discipline, config: draft }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Update failed");
      await refresh();
      setNotice("Template updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Archive this template?")) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/ops/thermal/report-templates/${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
      load(SEED_REPORT_TEMPLATES[0].id);
      setNotice("Template archived.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={t.eyebrow}>Report templates</p>
          <p className="mt-1 text-xs text-[var(--graphite-muted)]">
            ★ = built-in starting points. Edit and &ldquo;Save as new&rdquo; to make your own.
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => load(e.target.value)}
          className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          {allOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--graphite-muted)]">
          Template name
          <input
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-[var(--graphite-muted)]">
          Discipline
          <input
            value={draft.discipline}
            onChange={(e) => update("discipline", e.target.value)}
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Sections</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {(Object.keys(SECTION_LABELS) as ReportSectionKey[]).map((key) => {
          const on = draft.sections[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => update("sections", { ...draft.sections, [key]: !on })}
              className={`rounded-lg border px-2.5 py-1 font-medium transition-colors ${
                on
                  ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
              }`}
            >
              {on ? "✓ " : ""}{SECTION_LABELS[key]}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block text-xs text-[var(--graphite-muted)]">
        Standards (comma-separated)
        <input
          value={draft.standards.join(", ")}
          onChange={(e) => update("standards", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="mt-3 block text-xs text-[var(--graphite-muted)]">
        Methodology text
        <textarea
          value={draft.methodology_text}
          onChange={(e) => update("methodology_text", e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="mt-3 block text-xs text-[var(--graphite-muted)]">
        Disclaimer text
        <textarea
          value={draft.disclaimer_text}
          onChange={(e) => update("disclaimer_text", e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <ToggleChip on={draft.show_logo} onClick={() => update("show_logo", !draft.show_logo)}>Slate360 logo</ToggleChip>
        <ToggleChip on={draft.show_credentials} onClick={() => update("show_credentials", !draft.show_credentials)}>
          Level III credentials
        </ToggleChip>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={busy} onClick={saveAsNew}>
          Save as new
        </button>
        {!isSeed ? (
          <>
            <button type="button" className={t.secondaryButton} disabled={busy} onClick={saveUpdate}>
              Update this template
            </button>
            <button
              type="button"
              className="text-xs text-[#fca5a5] hover:underline"
              disabled={busy}
              onClick={remove}
            >
              Archive
            </button>
          </>
        ) : (
          <span className="text-xs text-[var(--graphite-muted)]">Built-in template — edit and &ldquo;Save as new&rdquo; to keep changes.</span>
        )}
      </div>

      {notice ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 font-medium transition-colors ${
        on
          ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
          : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
      }`}
    >
      {on ? "✓ " : ""}{children}
    </button>
  );
}
