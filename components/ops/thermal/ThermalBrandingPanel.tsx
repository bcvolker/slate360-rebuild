"use client";

import { useState } from "react";
import type { ThermalBrandingConfig } from "@/lib/thermal/types";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  sessionId: string;
  initial: ThermalBrandingConfig;
};

export function ThermalBrandingPanel({ sessionId, initial }: Props) {
  const [branding, setBranding] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onLogoFile(file: File | null) {
    if (!file) return;
    if (file.size > 600_000) {
      setMessage("Logo too large — use an image under ~600KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBranding((b) => ({ ...b, logo_url: String(reader.result) }));
    reader.readAsDataURL(file); // stored inline as a data: URI; embedded on the report
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding_config: branding }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMessage("Branding saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Report branding</p>
      <div className="mt-3 grid gap-3">
        <label className="block text-sm">
          <span className="text-[var(--graphite-muted)]">Company name</span>
          <input
            value={branding.company_name}
            onChange={(e) => setBranding((b) => ({ ...b, company_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 py-2 text-[var(--graphite-text-header)]"
          />
        </label>
        <div className="block text-sm">
          <span className="text-[var(--graphite-muted)]">Your logo (shown on the report cover)</span>
          <div className="mt-1 flex items-center gap-3">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="Logo preview" className="h-10 max-w-[120px] rounded border border-[var(--mobile-app-card-border)] object-contain bg-white/5" />
            ) : null}
            <label className="cursor-pointer rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]">
              Upload logo…
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)} />
            </label>
            {branding.logo_url ? (
              <button type="button" onClick={() => setBranding((b) => ({ ...b, logo_url: "" }))} className="text-xs text-[var(--graphite-muted)] hover:text-[#fca5a5]">
                Remove
              </button>
            ) : null}
          </div>
          <input
            value={branding.logo_url?.startsWith("data:") ? "" : branding.logo_url}
            placeholder="…or paste a hosted logo URL"
            onChange={(e) => setBranding((b) => ({ ...b, logo_url: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 py-2 text-[var(--graphite-text-header)]"
          />
        </div>
        <label className="block text-sm">
          <span className="text-[var(--graphite-muted)]">Primary color</span>
          <input
            value={branding.primary_color}
            onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 py-2 text-[var(--graphite-text-header)]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--graphite-text-body)]">
          <input
            type="checkbox"
            checked={branding.show_metrics}
            onChange={(e) => setBranding((b) => ({ ...b, show_metrics: e.target.checked }))}
          />
          Show metrics on share viewer
        </label>
        <label className="block text-sm">
          <span className="text-[var(--graphite-muted)]">Custom footer</span>
          <textarea
            value={branding.custom_footer}
            onChange={(e) => setBranding((b) => ({ ...b, custom_footer: e.target.value }))}
            rows={2}
            className="mt-1 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 py-2 text-[var(--graphite-text-header)]"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={saving} onClick={save}>
          Save branding
        </button>
        {message ? <span className="text-xs text-[var(--graphite-muted)]">{message}</span> : null}
      </div>
    </div>
  );
}
