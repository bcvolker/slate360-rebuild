"use client";

import { useState } from "react";
import type { BrandTheme } from "@/lib/spatial-walkthrough/types";
import type { SuggestedPalette } from "@/lib/spatial-walkthrough/palette";
import { BrandColorField, pushRecentColor, readRecentColors } from "./BrandColorField";
import { BrandLogoPanel } from "./BrandLogoPanel";
import { BrandThemePreview } from "./BrandThemePreview";

const FIELDS: Array<{ key: keyof SuggestedPalette; label: string; against?: keyof BrandTheme }> = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "accentColor", label: "Accent" },
  { key: "pageBgColor", label: "Background" },
  { key: "surfaceColor", label: "Surface" },
  { key: "textColor", label: "Text", against: "pageBgColor" },
  { key: "mutedTextColor", label: "Muted text", against: "pageBgColor" },
];

type Props = {
  initial: BrandTheme;
  onSaved?: () => void;
};

export function BrandThemeForm({ initial, onSaved }: Props) {
  const [theme, setTheme] = useState(initial);
  const [recent, setRecent] = useState(readRecentColors);
  const [suggested, setSuggested] = useState<SuggestedPalette | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const setColor = (key: keyof SuggestedPalette, value: string) => {
    setTheme((t) => ({ ...t, [key]: value }));
  };
  const commit = (value: string) => setRecent(pushRecentColor(value));

  const save = async () => {
    const res = await fetch("/api/spatial-walkthrough/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });
    setMessage(res.ok ? "Brand theme saved." : "Could not save theme.");
    if (res.ok) onSaved?.();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <div className="space-y-4 border border-white/10 bg-white/[0.04] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Brand theme</p>
        <BrandLogoPanel theme={theme} onTheme={setTheme} onSuggested={setSuggested} />
        {suggested ? (
          <div className="border border-white/10 p-3">
            <p className="mb-2 text-sm text-[var(--graphite-muted)]">Suggested from logo — not applied.</p>
            <div className="mb-2 flex h-8 overflow-hidden border border-white/10">
              {Object.values(suggested).map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} title={c} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-9 border border-white/10 px-3 text-sm" onClick={() => setTheme((t) => ({ ...t, ...suggested }))}>
                Apply suggestion
              </button>
              <button type="button" className="h-9 border border-white/10 px-3 text-sm" onClick={() => setSuggested(null)}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <BrandColorField
              key={field.key}
              label={field.label}
              value={String(theme[field.key] ?? "")}
              against={field.against ? String(theme[field.against]) : undefined}
              recent={recent}
              onChange={(v) => setColor(field.key, v)}
              onCommit={commit}
            />
          ))}
        </div>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={theme.showPoweredBy} onChange={(e) => setTheme((t) => ({ ...t, showPoweredBy: e.target.checked }))} />
          Show Powered by Slate360
        </label>
        <button type="button" onClick={() => void save()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
          Save branding
        </button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
      <BrandThemePreview theme={theme} />
    </div>
  );
}
