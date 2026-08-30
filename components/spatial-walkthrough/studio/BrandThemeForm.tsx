"use client";

import { useState } from "react";
import type { BrandTheme } from "@/lib/spatial-walkthrough/types";
import { isHexColor } from "@/lib/spatial-walkthrough/theme";

const FIELDS: Array<{ key: keyof BrandTheme; label: string }> = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "accentColor", label: "Accent" },
  { key: "pageBgColor", label: "Page" },
  { key: "surfaceColor", label: "Surface" },
  { key: "textColor", label: "Text" },
  { key: "mutedTextColor", label: "Muted text" },
];

type Props = {
  initial: BrandTheme;
  onSaved?: () => void;
};

export function BrandThemeForm({ initial, onSaved }: Props) {
  const [theme, setTheme] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

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
    <div className="space-y-4 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Brand theme</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const value = String(theme[field.key] ?? "");
          const hex = isHexColor(value) ? value : "#111111";
          return (
            <label key={field.key} className="text-sm">
              <span className="mb-1 block text-[var(--graphite-muted)]">{field.label}</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setTheme((t) => ({ ...t, [field.key]: e.target.value }))}
                  className="h-11 w-14 bg-transparent"
                  aria-label={`${field.label} picker`}
                />
                <input
                  value={value}
                  onChange={(e) => setTheme((t) => ({ ...t, [field.key]: e.target.value }))}
                  className="h-11 flex-1 border border-white/10 bg-transparent px-3 font-mono"
                  placeholder="#000000"
                />
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex h-12 overflow-hidden border border-white/10" aria-label="Palette preview">
        {FIELDS.map((field) => (
          <span key={field.key} className="flex-1" style={{ background: String(theme[field.key]) }} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={theme.showPoweredBy}
          onChange={(e) => setTheme((t) => ({ ...t, showPoweredBy: e.target.checked }))}
        />
        Show Powered by Slate360
      </label>
      <button type="button" onClick={() => void save()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
        Save branding
      </button>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
