"use client";

import { useEffect, useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";
import { ThermalReportHistory } from "@/components/ops/thermal/ThermalReportHistory";
import { ThermalTemplateGallery, type GalleryTemplate } from "@/components/ops/thermal/ThermalTemplateGallery";
import { SEED_REPORT_TEMPLATES } from "@/lib/thermal/report-templates";

type TemplateOption = GalleryTemplate;

const SEED_OPTIONS: TemplateOption[] = SEED_REPORT_TEMPLATES.map((s) => ({
  id: s.id,
  name: s.name,
  discipline: s.discipline,
  standards: s.standards,
  sections: s.sections,
}));

/** Report sub-tab: pick a template, add a signature, generate, and re-download. */
export function ThermalReportPanel({
  sessionId,
  initialTemplateId,
  initialSignature,
}: {
  sessionId: string;
  initialTemplateId?: string | null;
  initialSignature?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportRefresh, setReportRefresh] = useState(0);
  const [templates, setTemplates] = useState<TemplateOption[]>(SEED_OPTIONS);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "seed-general");
  const [signature, setSignature] = useState(initialSignature ?? "");

  useEffect(() => {
    fetch("/api/ops/thermal/report-templates")
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => {
        const org = (json?.data?.templates ?? json?.templates ?? []) as Array<
          Record<string, unknown>
        >;
        if (org.length) {
          const mapped: TemplateOption[] = org.map((o) => {
            const cfg = (o.config ?? o) as Record<string, unknown>;
            return {
              id: String(o.id),
              name: String(o.name ?? cfg.name ?? "Custom template"),
              discipline: typeof cfg.discipline === "string" ? cfg.discipline : undefined,
              standards: Array.isArray(cfg.standards) ? (cfg.standards as string[]) : undefined,
              sections:
                cfg.sections && typeof cfg.sections === "object"
                  ? (cfg.sections as Record<string, boolean>)
                  : undefined,
            };
          });
          setTemplates([...SEED_OPTIONS, ...mapped]);
        }
      })
      .catch(() => {});
  }, []);

  function persistMeta(meta: Record<string, unknown>) {
    fetch(`/api/ops/thermal/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: meta }),
    }).catch(() => {});
  }

  async function generateReport() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "report" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start report");
      setNotice("Report generation started — it will appear in history when ready.");
      setTimeout(() => setReportRefresh((n) => n + 1), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className={t.card}>
        <p className={t.eyebrow}>Report template</p>
        <p className="mt-2 text-xs text-[var(--graphite-muted)]">
          The template controls sections, standards, methodology, and severity scale.
        </p>
        <div className="mt-3">
          <p className="text-xs text-[var(--graphite-muted)]">Template</p>
          <div className="mt-1">
            <ThermalTemplateGallery
              templates={templates}
              selectedId={templateId}
              onSelect={(id) => { setTemplateId(id); persistMeta({ report_template_id: id }); }}
            />
          </div>
        </div>
        <label className="mt-2 block text-xs text-[var(--graphite-muted)]">
          Signature / credentials (optional)
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            onBlur={() => persistMeta({ report_signature: signature })}
            rows={2}
            placeholder="e.g. Inspector name, certification #, date"
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className={t.primaryButton} disabled={busy} onClick={generateReport}>
            Generate PDF report
          </button>
          {notice ? <span className="text-xs text-[var(--graphite-muted)]">{notice}</span> : null}
          {error ? <span className="text-xs text-[#fca5a5]">{error}</span> : null}
        </div>
      </div>

      <ThermalReportHistory sessionId={sessionId} refreshKey={reportRefresh} />
    </div>
  );
}
