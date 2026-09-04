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
 * The one secondary surface for immersive views: side panel on desktop, bottom
 * sheet on mobile (ce.css). Tabs carry compact count badges, never inline text.
 */
export function ViewerPanel({ open, title, tabs, activeTab, onTab, onClose, children }: Props) {
  return (
    <aside className="ce-viewer__side" hidden={!open} aria-hidden={!open} data-testid="ce-panel">
      <div className="ce-viewer__side-head">
        {tabs && tabs.length > 1 ? (
          <div role="tablist" className="ce-tabs" aria-label={title}>
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === activeTab} className="ce-tab" onClick={() => onTab?.(t.key)}>
                {t.label}{typeof t.count === "number" && t.count > 0 ? <span className="ce-badge">{t.count}</span> : null}
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

export function SharePanelBody({ url, poweredBy }: { url: string; poweredBy?: boolean }) {
  return (
    <div className="ce-item">
      <p className="ce-body" style={{ margin: 0 }}>This link opens the project exactly as you see it now — same view, same moment. Anyone with the link and access to this project can open it.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <input readOnly value={url} aria-label="Share link" className="ce-field" style={{ fontSize: 13 }} />
        <button type="button" className="ce-btn" onClick={() => { void navigator.clipboard?.writeText(url); }}>Copy</button>
      </div>
      {poweredBy ? <p className="ce-eyebrow">Powered by Slate360</p> : null}
    </div>
  );
}
