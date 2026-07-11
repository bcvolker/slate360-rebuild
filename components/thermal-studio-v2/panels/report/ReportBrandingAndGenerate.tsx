"use client";

import { useEffect, useState } from "react";
import { dispatchThermalJob } from "@/components/thermal-studio-v2/lib/api";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";
import type { ReportConditions } from "@/components/thermal-studio-v2/lib/useReportState";

type ReportRow = { id: string; title: string; generated_at: string | null };

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
      />
    </label>
  );
}

/** Right rail — branding profile + site conditions + signature + Generate PDF + history (doc §1, Tab 4). */
export function ReportBrandingAndGenerate({
  sessionId,
  branding,
  onBrandingChange,
  conditions,
  onConditionsChange,
  signature,
  onSignatureChange,
  captureIds,
}: {
  sessionId: string;
  branding: ThermalBrandingConfig;
  onBrandingChange: (next: Partial<ThermalBrandingConfig>) => void;
  conditions: ReportConditions;
  onConditionsChange: (next: ReportConditions) => void;
  signature: string;
  onSignatureChange: (next: string) => void;
  captureIds: string[];
}) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportRow[]>([]);

  function loadHistory() {
    void fetch(`/api/ops/thermal/sessions/${sessionId}/reports`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { reports?: ReportRow[] } | null) => setHistory(json?.reports ?? []))
      .catch(() => {});
  }

  useEffect(loadHistory, [sessionId]);

  async function generate() {
    if (!captureIds.length) return;
    setGenerating(true);
    setStatus("Generating…");
    const result = await dispatchThermalJob(sessionId, "report", captureIds);
    setStatus(result.message);
    setGenerating(false);
    if (result.ok) setTimeout(loadHistory, 3000);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Branding</span>
        <Field label="Company" value={branding.company_name} onChange={(v) => onBrandingChange({ company_name: v })} />
        <Field label="Logo URL" value={branding.logo_url} onChange={(v) => onBrandingChange({ logo_url: v })} placeholder="https://…" />
        <Field label="Footer" value={branding.custom_footer} onChange={(v) => onBrandingChange({ custom_footer: v })} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Site conditions</span>
        <Field label="Ambient (°C)" value={String(conditions.ambient_c ?? "")} onChange={(v) => onConditionsChange({ ...conditions, ambient_c: v })} />
        <Field label="Wind (mph)" value={String(conditions.wind_mph ?? "")} onChange={(v) => onConditionsChange({ ...conditions, wind_mph: v })} />
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-[var(--graphite-muted)]">
        Signature
        <textarea
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          rows={3}
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-[var(--graphite-text-header)] focus:border-[var(--graphite-primary)] focus:outline-none"
        />
      </label>
      <button
        type="button"
        disabled={generating || !captureIds.length}
        onClick={() => void generate()}
        title={`Generate a PDF for ${captureIds.length} image${captureIds.length === 1 ? "" : "s"}`}
        className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? "Generating…" : `Generate PDF (${captureIds.length})`}
      </button>
      {status ? <span className="text-[10px] text-[var(--graphite-muted)]">{status}</span> : null}
      {history.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">History</span>
          {history.map((r) => (
            <a
              key={r.id}
              href={`/api/ops/thermal/sessions/${sessionId}/reports?download=${r.id}&fmt=pdf`}
              target="_blank"
              rel="noreferrer"
              className="truncate rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
            >
              {r.title}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
