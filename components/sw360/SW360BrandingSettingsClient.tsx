"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";

type BrandSettings = {
  logo_url?: string;
  primary_color?: string;
  header_html?: string;
  footer_html?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
};

const inputClass =
  "min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]";
const labelClass = "text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60";

/**
 * SW360-styled surface for org branding — the org logo this reads/writes
 * (organizations.brand_settings + deliverable_logo_s3_key) is already read
 * by the PDF export route's header (confirmed working); the only thing
 * missing was a reachable settings screen. Reuses the existing working
 * endpoints (/api/site-walk/branding/settings, /api/site-walk/branding)
 * rather than the legacy setup-wizard form, which sits in an unreachable
 * (act-1-setup) route with Graphite Glass styling.
 */
export function SW360BrandingSettingsClient({ initial }: { initial: BrandSettings }) {
  const [settings, setSettings] = useState<BrandSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function update<K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-walk/branding/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Couldn't save. Try again.");
      setMessage({ kind: "ok", text: "Saved. This shows up on every PDF report your org generates." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      const res = await fetch("/api/site-walk/branding", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Couldn't upload the logo. Try again.");
      const body = (await res.json()) as { url?: string };
      update("logo_url", body.url ?? "");
      setMessage({ kind: "ok", text: "Logo uploaded. Save to confirm." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Couldn't upload the logo." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={labelClass}>Logo</p>
        <div className="mt-1 flex items-center gap-3">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt="Org logo"
              className="h-12 max-w-[120px] rounded border border-[var(--border)] bg-white object-contain p-1"
            />
          ) : null}
          <label className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--sw360-charcoal)]/30 text-sm font-bold text-[var(--sw360-charcoal)]/70">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => void uploadLogo(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div>
        <p className={labelClass}>Report header (optional)</p>
        <textarea
          value={settings.header_html ?? ""}
          onChange={(e) => update("header_html", e.target.value)}
          placeholder="Company name / tagline shown on reports"
          className={`${inputClass} min-h-[64px] resize-none py-2`}
        />
      </div>
      <div>
        <p className={labelClass}>Report footer (optional)</p>
        <textarea
          value={settings.footer_html ?? ""}
          onChange={(e) => update("footer_html", e.target.value)}
          placeholder="License #, disclaimer, or contact info"
          className={`${inputClass} min-h-[64px] resize-none py-2`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className={labelClass}>Contact email</p>
          <input
            value={settings.contact_email ?? ""}
            onChange={(e) => update("contact_email", e.target.value)}
            type="email"
            className={inputClass}
          />
        </div>
        <div>
          <p className={labelClass}>Contact phone</p>
          <input
            value={settings.contact_phone ?? ""}
            onChange={(e) => update("contact_phone", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {message ? (
        <p
          className={
            message.kind === "ok"
              ? "text-xs font-semibold text-[var(--sw360-green-light)]"
              : "text-xs font-semibold text-[var(--sw360-destructive)]"
          }
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        Save branding
      </button>
    </div>
  );
}
