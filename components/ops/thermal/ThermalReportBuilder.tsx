"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { StudioHandle } from "@/components/studio/StudioPanels";
import { ThermalReportPreview } from "@/components/ops/thermal/ThermalReportPreview";
import { ThermalTemplateGallery, type GalleryTemplate } from "@/components/ops/thermal/ThermalTemplateGallery";
import { ThermalReportHistory } from "@/components/ops/thermal/ThermalReportHistory";
import { SEED_REPORT_TEMPLATES, type ThermalReportTemplate } from "@/lib/thermal/report-templates";
import type { StudioCapture } from "@/components/ops/thermal/ThermalStudioWorkView";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

type Conditions = {
  ambient_c?: number | string;
  wind_mph?: number | string;
  focal_mm?: number | string;
  operator_notes?: string;
};

/**
 * Report Builder — same frame as Inspect: the ordered set LEFT, a live WYSIWYG
 * report preview CENTER (updates as you change the template, order, conditions,
 * signature), and the template gallery + conditions + generate RIGHT.
 */
export function ThermalReportBuilder({
  sessionId,
  sessionName,
  captures,
  reportOrder,
  onReorder,
  onRemove,
  brandingConfig,
  summary,
  initialTemplateId,
  initialSignature,
  initialConditions,
}: {
  sessionId: string;
  sessionName?: string;
  captures: StudioCapture[];
  reportOrder: string[];
  onReorder: (idx: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  brandingConfig?: ThermalBrandingConfig;
  summary?: Record<string, unknown> | null;
  initialTemplateId?: string | null;
  initialSignature?: string | null;
  initialConditions?: Record<string, unknown> | null;
}) {
  const byId = useMemo(() => new Map(captures.map((c) => [c.id, c])), [captures]);
  const order = reportOrder;
  const [conditions, setConditions] = useState<Conditions>((initialConditions ?? {}) as Conditions);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ThermalReportTemplate[]>(SEED_REPORT_TEMPLATES);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "seed-general");
  const [signature, setSignature] = useState(initialSignature ?? "");
  const [busy, setBusy] = useState(false);
  const [genNote, setGenNote] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [reportRefresh, setReportRefresh] = useState(0);

  // Pull org templates (full config) so the preview can render methodology /
  // disclaimer / severity / sections, not just the name.
  useEffect(() => {
    fetch("/api/ops/thermal/report-templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const org = (json?.data?.templates ?? json?.templates ?? []) as Array<Record<string, unknown>>;
        if (!org.length) return;
        const mapped = org.map((o) => {
          const cfg = (o.config ?? o) as Record<string, unknown>;
          return { ...(cfg as object), id: String(o.id), name: String(o.name ?? cfg.name ?? "Custom template") } as ThermalReportTemplate;
        });
        setTemplates([...SEED_REPORT_TEMPLATES, ...mapped]);
      })
      .catch(() => {});
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? SEED_REPORT_TEMPLATES.find((t) => t.id === "seed-general")!,
    [templates, templateId],
  );
  const galleryTemplates: GalleryTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    standards: t.standards,
    sections: t.sections,
  }));

  function persistMeta(meta: Record<string, unknown>) {
    fetch(`/api/ops/thermal/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: meta }),
    }).catch(() => {});
  }
  function setCond(patch: Conditions) {
    setConditions((prev) => ({ ...prev, ...patch }));
  }
  function saveConditions() {
    const clean: Conditions = {
      ambient_c: conditions.ambient_c === "" ? undefined : Number(conditions.ambient_c),
      wind_mph: conditions.wind_mph === "" ? undefined : Number(conditions.wind_mph),
      focal_mm: conditions.focal_mm === "" ? undefined : Number(conditions.focal_mm),
      operator_notes: conditions.operator_notes,
    };
    fetch(`/api/ops/thermal/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { conditions: clean } }),
    })
      .then(() => { setSavedNote("Conditions saved."); setTimeout(() => setSavedNote(null), 2500); })
      .catch(() => setSavedNote("Could not save conditions."));
  }
  async function generateReport() {
    setBusy(true);
    setGenError(null);
    setGenNote(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "report" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start report");
      setGenNote("Report generation started — it will appear in history when ready.");
      setTimeout(() => setReportRefresh((n) => n + 1), 4000);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  const numInput =
    "mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white";

  return (
    // Resizable frame: ordered set LEFT, live report preview CENTER, controls RIGHT.
    <div className="h-full min-h-0 p-2">
      <PanelGroup direction="horizontal" className="h-full min-h-0">
      {/* LEFT: ordered report set */}
      <Panel order={1} collapsible collapsedSize={0} defaultSize={20} minSize={12} className="min-w-0">
      <aside className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--mobile-app-card-border)] p-2">
        <p className="shrink-0 pb-1.5 text-xs font-semibold text-[var(--graphite-text-header)]">
          Report set · {order.length} image{order.length === 1 ? "" : "s"}
        </p>
        {order.length === 0 ? (
          <p className="text-[11px] text-[var(--graphite-muted)]">
            No images yet — mark images with ★ in the Library to add them here.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {order.map((id, idx) => {
              const c = byId.get(id);
              if (!c) return null;
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg border border-[var(--mobile-app-card-border)] p-1.5">
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-[var(--graphite-muted)]">{idx + 1}</span>
                  {c.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.previewUrl} alt={c.filename} className="h-9 w-12 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-9 w-12 shrink-0 rounded bg-[#111827]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--graphite-text-body)]">{c.filename}</span>
                  <button type="button" onClick={() => onReorder(idx, -1)} disabled={idx === 0}
                    className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30" title="Move up">↑</button>
                  <button type="button" onClick={() => onReorder(idx, 1)} disabled={idx === order.length - 1}
                    className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:opacity-30" title="Move down">↓</button>
                  <button type="button" onClick={() => onRemove(id)}
                    className="rounded border border-[var(--mobile-app-card-border)] px-1.5 text-xs text-[var(--graphite-muted)] hover:text-[#fca5a5]" title="Remove">✕</button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      </Panel>
      <StudioHandle vertical />

      {/* CENTER: live WYSIWYG report preview */}
      <Panel order={2} defaultSize={56} minSize={35} className="min-w-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas-deep)] py-2">
        <div className="flex shrink-0 items-center justify-between px-3 pb-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
            Preview · {selectedTemplate.name}
          </span>
          <span className="text-[10px] text-[var(--graphite-muted)]">What the PDF / share link will look like</span>
        </div>
        <ThermalReportPreview
          sessionName={sessionName ?? "Thermal Inspection"}
          template={selectedTemplate}
          branding={brandingConfig ?? ({ company_name: "", logo_url: "", primary_color: "", show_metrics: true, custom_footer: "" } as ThermalBrandingConfig)}
          conditions={conditions}
          signature={signature}
          order={order}
          byId={byId}
          summary={summary}
        />
      </div>
      </Panel>
      <StudioHandle vertical />

      {/* RIGHT: template + conditions + generate */}
      <Panel order={3} collapsible collapsedSize={0} defaultSize={24} minSize={18} className="min-w-0">
      <aside className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Template</p>
          <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">
            Controls sections, standards, methodology, and severity scale — preview updates live.
          </p>
          <div className="mt-2">
            <ThermalTemplateGallery
              templates={galleryTemplates}
              selectedId={templateId}
              onSelect={(id) => { setTemplateId(id); persistMeta({ report_template_id: id }); }}
            />
          </div>
          <label className="mt-3 block text-[11px] text-[var(--graphite-muted)]">
            Signature / credentials
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              onBlur={() => persistMeta({ report_signature: signature })}
              rows={2}
              placeholder="Inspector name, certification #, date"
              className={numInput}
            />
          </label>
        </div>

        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <p className="text-xs font-semibold text-[var(--graphite-text-header)]">Site conditions</p>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Ambient (°C)
            <input type="number" value={conditions.ambient_c ?? ""} onChange={(e) => setCond({ ambient_c: e.target.value })} className={numInput} />
          </label>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Wind (mph)
            <input type="number" value={conditions.wind_mph ?? ""} onChange={(e) => setCond({ wind_mph: e.target.value })} className={numInput} />
          </label>
          <label className="mt-2 block text-[11px] text-[var(--graphite-muted)]">Focal length (mm)
            <input type="number" value={conditions.focal_mm ?? ""} onChange={(e) => setCond({ focal_mm: e.target.value })} className={numInput} />
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={saveConditions}
              className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]">
              Save conditions
            </button>
            {savedNote ? <span className="text-[11px] text-[var(--graphite-muted)]">{savedNote}</span> : null}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <button
            type="button"
            disabled={busy}
            onClick={generateReport}
            className="w-full rounded-lg bg-[var(--graphite-primary)] px-3 py-2 text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-50"
          >
            {busy ? "Starting…" : "Generate PDF report"}
          </button>
          {genNote ? <p className="mt-1.5 text-[11px] text-[var(--graphite-muted)]">{genNote}</p> : null}
          {genError ? <p className="mt-1.5 text-[11px] text-[#fca5a5]">{genError}</p> : null}
        </div>

        <ThermalReportHistory sessionId={sessionId} refreshKey={reportRefresh} />
      </aside>
      </Panel>
      </PanelGroup>
    </div>
  );
}
