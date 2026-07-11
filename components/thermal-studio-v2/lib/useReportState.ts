"use client";

import { useEffect, useRef, useState } from "react";
import { SEED_REPORT_TEMPLATES, type ReportSectionKey, type ThermalReportTemplate } from "@/lib/thermal/report-templates";
import { listReportTemplates } from "@/components/thermal-studio-v2/lib/report-templates-api";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";

export type ReportConditions = { ambient_c?: number | string; wind_mph?: number | string; focal_mm?: number | string };

type SessionShape = {
  name?: string;
  branding_config?: Partial<ThermalBrandingConfig>;
  summary_metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const DEFAULT_BRANDING: ThermalBrandingConfig = {
  company_name: "",
  logo_url: "",
  primary_color: "",
  show_metrics: true,
  custom_footer: "",
};

/**
 * S7 report-editor state — re-openable (doc: "Continue editing restores
 * exactly"). Template/branding/conditions/signature persist to
 * session.metadata.report + branding_config via the existing session PATCH
 * (already jsonb-merges, no new backend needed). The image ORDER itself is
 * NOT duplicated here — it's session.metadata.report_set, the same field
 * Library's ★ funnel already writes via useLibrarySelection's reportOrder/
 * reorderReport, so the outline and the ★ funnel never disagree.
 */
export function useReportState(sessionId: string) {
  const [sessionName, setSessionName] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [templates, setTemplates] = useState<ThermalReportTemplate[]>(SEED_REPORT_TEMPLATES);
  const [templateId, setTemplateIdState] = useState<string>(SEED_REPORT_TEMPLATES[0]?.id ?? "");
  const [branding, setBrandingState] = useState<ThermalBrandingConfig>(DEFAULT_BRANDING);
  const [conditions, setConditionsState] = useState<ReportConditions>({});
  const [signature, setSignatureState] = useState("");
  const [sectionOverrides, setSectionOverridesState] = useState<Partial<Record<ReportSectionKey, boolean>>>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listReportTemplates().then((rows) => {
      if (!cancelled && rows.length) setTemplates([...SEED_REPORT_TEMPLATES, ...rows]);
    });
    void fetch(`/api/ops/thermal/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { session?: SessionShape } | null) => {
        if (cancelled || !json?.session) return;
        const s = json.session;
        setSessionName(s.name ?? "");
        setSummary(s.summary_metrics ?? null);
        setBrandingState({ ...DEFAULT_BRANDING, ...(s.branding_config ?? {}) });
        const report = (s.metadata?.report ?? null) as
          | {
              templateId?: string;
              conditions?: ReportConditions;
              signature?: string;
              sectionOverrides?: Partial<Record<ReportSectionKey, boolean>>;
            }
          | null;
        if (report?.templateId) setTemplateIdState(report.templateId);
        if (report?.conditions) setConditionsState(report.conditions);
        if (typeof report?.signature === "string") setSignatureState(report.signature);
        if (report?.sectionOverrides) setSectionOverridesState(report.sectionOverrides);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  type Snapshot = {
    templateId: string;
    conditions: ReportConditions;
    signature: string;
    branding: ThermalBrandingConfig;
    sectionOverrides: Partial<Record<ReportSectionKey, boolean>>;
  };

  function persist(next: Snapshot) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding_config: next.branding,
          metadata: {
            report: {
              templateId: next.templateId,
              conditions: next.conditions,
              signature: next.signature,
              sectionOverrides: next.sectionOverrides,
            },
          },
        }),
      }).catch(() => {});
    }, 500);
  }

  function setTemplateId(id: string) {
    setTemplateIdState(id);
    persist({ templateId: id, conditions, signature, branding, sectionOverrides });
  }
  function setConditions(next: ReportConditions) {
    setConditionsState(next);
    persist({ templateId, conditions: next, signature, branding, sectionOverrides });
  }
  function setSignature(next: string) {
    setSignatureState(next);
    persist({ templateId, conditions, signature: next, branding, sectionOverrides });
  }
  function setBranding(next: Partial<ThermalBrandingConfig>) {
    const merged = { ...branding, ...next };
    setBrandingState(merged);
    persist({ templateId, conditions, signature, branding: merged, sectionOverrides });
  }
  function toggleSection(key: ReportSectionKey, on: boolean) {
    const merged = { ...sectionOverrides, [key]: on };
    setSectionOverridesState(merged);
    persist({ templateId, conditions, signature, branding, sectionOverrides: merged });
  }

  const baseTemplate = templates.find((t) => t.id === templateId) ?? templates[0] ?? SEED_REPORT_TEMPLATES[0];
  const template: ThermalReportTemplate = { ...baseTemplate, sections: { ...baseTemplate.sections, ...sectionOverrides } };

  return {
    loaded,
    sessionName,
    summary,
    templates,
    template,
    templateId,
    setTemplateId,
    branding,
    setBranding,
    conditions,
    setConditions,
    signature,
    setSignature,
    toggleSection,
  };
}
