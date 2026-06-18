"use client";

import { useEffect, useState } from "react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

const PLACEMENTS = [
  { id: "homepage_hero", label: "Homepage hero" },
  { id: "feature_tile", label: "Feature tile" },
  { id: "learn_more", label: "Learn More" },
  { id: "other", label: "Other" },
] as const;

function placementLabel(id: string): string {
  return PLACEMENTS.find((p) => p.id === id)?.label ?? id;
}

export function ContentTab() {
  const { contentAssets, contentLoaded, busy, fetchContent, addContent, removeContent } = useOpsConsoleStore();
  const [placement, setPlacement] = useState<string>("homepage_hero");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    void fetchContent();
  }, [fetchContent]);

  async function handleAdd() {
    if (!/^https?:\/\//i.test(url)) return;
    const ok = await addContent({ placement, url, label: label || undefined });
    if (ok) {
      setUrl("");
      setLabel("");
    }
  }

  return (
    <div className="space-y-4">
      <div className={t.card}>
        <p className={t.eyebrow}>Add content asset</p>
        <p className={`mt-1 ${t.emptyNote}`}>
          Point a marketing surface at an asset URL — changeable without a redeploy.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select className={t.input} value={placement} onChange={(e) => setPlacement(e.target.value)}>
            {PLACEMENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input className={t.input} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input className={t.input} placeholder="https://… asset URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button
            type="button"
            className={t.primaryButton}
            disabled={busy || !/^https?:\/\//i.test(url)}
            onClick={handleAdd}
          >
            Add asset
          </button>
        </div>
        <p className={`mt-2 ${t.emptyNote}`}>Direct file upload (via SlateDrop) ships in a later slice.</p>
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Content assets ({contentAssets.length})</p>
        {contentAssets.length ? (
          <ul className="mt-3 space-y-2">
            {contentAssets.map((a) => (
              <li key={a.id} className={t.row}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={t.badgeInfo}>{placementLabel(a.placement)}</span>
                    {a.label ? <span className="text-sm text-[var(--graphite-text-header)]">{a.label}</span> : null}
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                  >
                    {a.url}
                  </a>
                </div>
                <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => removeContent(a.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`mt-3 ${t.emptyNote}`}>{contentLoaded ? "No content assets yet." : "Loading…"}</p>
        )}
      </div>
    </div>
  );
}
