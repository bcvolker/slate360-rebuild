"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type PanelTab = { key: string; label: string; count?: number };

type Props = {
  open: boolean;
  title: string;
  tabs?: PanelTab[];
  activeTab?: string;
  onTab?: (key: string) => void;
  onClose: () => void;
  children: ReactNode;
};

/**
 * The one secondary surface for immersive views: a side panel on desktop, a
 * bottom sheet on mobile (see ce.css). Plan, Items, Spaces and Share all live
 * here so the viewer itself stays uncluttered.
 */
export function ViewerPanel({ open, title, tabs, activeTab, onTab, onClose, children }: Props) {
  return (
    <aside className="ce-viewer__side" hidden={!open} aria-hidden={!open} data-testid="ce-panel">
      <div className="ce-viewer__side-head">
        {tabs && tabs.length > 1 ? (
          <div role="tablist" style={{ display: "flex", gap: 2 }}>
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === activeTab} className="ce-dock__btn" aria-pressed={t.key === activeTab} onClick={() => onTab?.(t.key)}>
                {t.label}{typeof t.count === "number" ? <span className="ce-num" style={{ opacity: .6, marginLeft: 4 }}>{t.count}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="ce-h3">{title}</h2>
        )}
        <button type="button" className="ce-btn ce-btn--icon ce-btn--sm" onClick={onClose} aria-label="Close panel"><X size={16} /></button>
      </div>
      <div className="ce-viewer__side-body">{children}</div>
    </aside>
  );
}

export function SharePanelBody({ url }: { url: string }) {
  return (
    <div className="ce-item">
      <p className="ce-body" style={{ margin: 0 }}>This link opens the project exactly as you see it now — same view, same time. Anyone with the link and access to this project can open it.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <input readOnly value={url} aria-label="Share link" style={{ minHeight: 40, padding: "0 12px", borderRadius: 6, border: "1px solid var(--ce-line-strong)", background: "transparent", color: "inherit", font: "inherit", fontSize: 13 }} />
        <button type="button" className="ce-btn" onClick={() => { void navigator.clipboard?.writeText(url); }}>Copy</button>
      </div>
    </div>
  );
}
