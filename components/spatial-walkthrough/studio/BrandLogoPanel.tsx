"use client";

import { useState } from "react";
import type { BrandTheme, LogoTreatment } from "@/lib/spatial-walkthrough/types";
import { extractPaletteFromPixels, extractPaletteFromSvg, suggestThemeFromColors, type SuggestedPalette } from "@/lib/spatial-walkthrough/palette";
import { LOGO_TREATMENTS } from "./BrandThemePreview";

type Props = {
  theme: BrandTheme;
  onTheme: (next: BrandTheme) => void;
  onSuggested: (palette: SuggestedPalette) => void;
};

async function paletteFromFile(file: File): Promise<string[]> {
  if (file.type.includes("svg") || file.name.toLowerCase().endsWith(".svg")) {
    return extractPaletteFromSvg(await file.text());
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(bitmap, 0, 0, size, size);
  return extractPaletteFromPixels(ctx.getImageData(0, 0, size, size).data);
}

export function BrandLogoPanel({ theme, onTheme, onSuggested }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const colors = await paletteFromFile(file);
      const suggested = suggestThemeFromColors(colors);
      if (suggested) onSuggested(suggested);
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/spatial-walkthrough/theme/logo", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Logo upload failed");
      onTheme({ ...theme, logoUrl: `${json.logoUrl}?v=${Date.now()}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Logo</p>
      <div className="flex flex-wrap items-center gap-3">
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" className={`h-10 w-auto max-w-[160px] object-contain sw-logo--${theme.logoTreatment}`} />
        ) : (
          <span className="text-sm text-[var(--graphite-muted)]">SVG, PNG, or WebP</span>
        )}
        <label className="inline-flex h-11 cursor-pointer items-center border border-white/10 px-3 text-sm">
          {busy ? "Uploading…" : "Upload logo"}
          <input
            type="file"
            accept="image/svg+xml,image/png,image/webp,.svg,.png,.webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void upload(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {LOGO_TREATMENTS.map((treatment: LogoTreatment) => (
          <button
            key={treatment}
            type="button"
            className="h-9 border border-white/10 px-3 text-xs uppercase tracking-[0.12em] text-[var(--graphite-muted)] data-[on=true]:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] data-[on=true]:text-[var(--graphite-primary)]"
            data-on={theme.logoTreatment === treatment}
            onClick={() => onTheme({ ...theme, logoTreatment: treatment })}
          >
            {treatment}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm">{error}</p> : null}
    </div>
  );
}
