/**
 * Slate360 Color / Skin Audit Page
 *
 * Route: /_color-audit
 *
 * Purpose: Diagnose why a surface (homepage, dashboard, etc.) does not match
 * the mobile-shell-v2 app skin. Run in the browser. Tells you, in plain text:
 *   1. The actual computed CSS variable values on this document
 *   2. The applied <html> classes (light / dark)
 *   3. Service-worker registration state + an unregister button (CSS cache buster)
 *   4. Every element on the homepage whose computed color is in the amber family
 *      (so you know exactly which file is producing each amber pixel)
 *
 * Use it after every skin change. If a value here is wrong, the change did not
 * land. If a value here is correct but the page still looks wrong, the offender
 * is in the "amber elements" list.
 */
"use client";

import { useEffect, useState, useCallback } from "react";

type VarRow = { name: string; value: string };
type AmberHit = {
  tag: string;
  classes: string;
  text: string;
  bg: string;
  color: string;
  border: string;
  shadow: string;
  selector: string;
};
type SwState = {
  supported: boolean;
  registrations: number;
  scopes: string[];
  controllerActive: boolean;
};

const VARS_TO_CHECK = [
  "--background",
  "--foreground",
  "--card",
  "--primary",
  "--primary-foreground",
  "--primary-hover",
  "--ring",
  "--accent-teal",
  "--accent-teal-soft",
  "--app-page",
  "--app-card",
  "--app-border",
  "--app-glass",
  "--app-glow-amber",
  "--slate-gold",
  "--slate-gold-hover",
  "--slate-accent",
  "--slate-blue",
  "--surface-page",
  "--surface-card",
  "--text-primary",
  "--text-secondary",
  "--module-hub",
];

const AMBER_HEX_PATTERNS = [
  /245,\s*158,\s*11/i, // rgb(245, 158, 11) — amber-500
  /217,\s*119,\s*6/i, // rgb(217, 119, 6) — amber-600
  /212,\s*175,\s*55/i, // rgb(212, 175, 55) — old industrial gold #D4AF37
  /251,\s*191,\s*36/i, // amber-400
];

function isAmberColor(value: string): boolean {
  if (!value || value === "none" || value === "rgba(0, 0, 0, 0)") return false;
  return AMBER_HEX_PATTERNS.some((rx) => rx.test(value));
}

function selectorOf(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && depth < 4) {
    const tag = node.tagName.toLowerCase();
    const id = node.id ? `#${node.id}` : "";
    const cls = node.className && typeof node.className === "string"
      ? "." + node.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
    parts.unshift(`${tag}${id}${cls}`);
    node = node.parentElement;
    depth++;
  }
  return parts.join(" > ");
}

export default function ColorAuditPage() {
  const [vars, setVars] = useState<VarRow[]>([]);
  const [htmlClasses, setHtmlClasses] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [sw, setSw] = useState<SwState>({
    supported: false,
    registrations: 0,
    scopes: [],
    controllerActive: false,
  });
  const [hits, setHits] = useState<AmberHit[]>([]);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const refreshVars = useCallback(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    setVars(
      VARS_TO_CHECK.map((name) => ({
        name,
        value: computed.getPropertyValue(name).trim() || "(unset)",
      }))
    );
    setHtmlClasses(root.className || "(none)");
    try {
      setTheme(localStorage.getItem("slate360-theme") || "(unset → defaults to dark)");
    } catch {
      setTheme("(localStorage blocked)");
    }
  }, []);

  const refreshSw = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setSw({ supported: false, registrations: 0, scopes: [], controllerActive: false });
      return;
    }
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      setSw({
        supported: true,
        registrations: regs.length,
        scopes: regs.map((r) => r.scope),
        controllerActive: !!navigator.serviceWorker.controller,
      });
    } catch {
      setSw({ supported: true, registrations: -1, scopes: [], controllerActive: false });
    }
  }, []);

  const scanAmber = useCallback(() => {
    setScanError(null);
    const iframe = document.getElementById("audit-frame") as HTMLIFrameElement | null;
    if (!iframe) {
      setScanError("Iframe not found");
      return;
    }
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      setScanError("Iframe document not accessible");
      return;
    }
    const all = doc.querySelectorAll("*");
    const found: AmberHit[] = [];
    all.forEach((el) => {
      const cs = win.getComputedStyle(el as Element);
      const color = cs.color;
      const bg = cs.backgroundColor;
      const border = cs.borderTopColor;
      const shadow = cs.boxShadow;
      const isHit =
        isAmberColor(color) ||
        isAmberColor(bg) ||
        isAmberColor(border) ||
        isAmberColor(shadow);
      if (isHit) {
        const e = el as HTMLElement;
        found.push({
          tag: e.tagName.toLowerCase(),
          classes: typeof e.className === "string" ? e.className.slice(0, 80) : "",
          text: (e.textContent || "").trim().slice(0, 50),
          bg,
          color,
          border,
          shadow: shadow.slice(0, 60),
          selector: selectorOf(e),
        });
      }
    });
    setHits(found.slice(0, 200));
  }, []);

  const unregisterSw = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await refreshSw();
    alert("Service worker(s) unregistered and caches cleared. Hard reload now.");
  }, [refreshSw]);

  useEffect(() => {
    refreshVars();
    refreshSw();
  }, [refreshVars, refreshSw]);

  return (
    <div style={{ background: "#0B0F15", color: "#e2e8f0", minHeight: "100vh", padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Slate360 Color / Skin Audit</h1>
      <p style={{ color: "#94a3b8", marginBottom: 16 }}>
        Browser-side diagnostic. Bookmark this page. Use it to verify every skin change.
      </p>

      <Section title="1. Theme state on THIS document">
        <Row label="<html> classes" value={htmlClasses} />
        <Row label="localStorage 'slate360-theme'" value={theme} />
        <button onClick={refreshVars} style={btnStyle}>Refresh</button>
      </Section>

      <Section title="2. Computed CSS variables on :root">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={th}>Variable</th>
              <th style={th}>Value</th>
              <th style={th}>Swatch</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v) => (
              <tr key={v.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={td}>{v.name}</td>
                <td style={{ ...td, color: v.value === "(unset)" ? "#ef4444" : "#e2e8f0" }}>{v.value}</td>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 20,
                      height: 20,
                      background: v.value !== "(unset)" ? v.value : "transparent",
                      border: "1px solid rgba(255,255,255,0.2)",
                      verticalAlign: "middle",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="3. Service worker (likely cause of stale CSS)">
        <Row label="Supported" value={String(sw.supported)} />
        <Row label="Registrations" value={String(sw.registrations)} />
        <Row label="Controller active" value={String(sw.controllerActive)} />
        {sw.scopes.length > 0 && (
          <Row label="Scopes" value={sw.scopes.join(", ")} />
        )}
        <button onClick={refreshSw} style={btnStyle}>Refresh</button>
        {" "}
        <button onClick={unregisterSw} style={{ ...btnStyle, background: "#F59E0B", color: "#451a03" }}>
          Unregister SW + Clear Caches
        </button>
        <p style={{ color: "#64748b", marginTop: 8, fontSize: 11 }}>
          After unregistering, hard reload (Cmd/Ctrl+Shift+R) to bypass any remaining browser cache.
        </p>
      </Section>

      <Section title="4. Amber / gold elements on the homepage">
        <p style={{ color: "#94a3b8", marginBottom: 8 }}>
          Loads <code>/</code> in an iframe and lists every element whose computed color, background,
          border, or shadow falls in the amber/gold family. If the homepage looks too gold, every offender
          is in this list with its tag/classes/text — fix those files.
        </p>
        <div style={{ marginBottom: 12 }}>
          <button onClick={scanAmber} disabled={!iframeLoaded} style={btnStyle}>
            {iframeLoaded ? "Scan homepage now" : "Waiting for iframe to load..."}
          </button>
          {scanError && <span style={{ color: "#ef4444", marginLeft: 12 }}>{scanError}</span>}
          {hits.length > 0 && (
            <span style={{ marginLeft: 12, color: "#94a3b8" }}>
              {hits.length} amber element{hits.length === 1 ? "" : "s"} found{hits.length === 200 ? " (capped at 200)" : ""}
            </span>
          )}
        </div>
        <iframe
          id="audit-frame"
          src="/"
          onLoad={() => setIframeLoaded(true)}
          style={{
            width: "100%",
            height: 320,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#000",
            marginBottom: 16,
          }}
        />
        {hits.length > 0 && (
          <div style={{ maxHeight: 480, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead style={{ position: "sticky", top: 0, background: "#151A23" }}>
                <tr>
                  <th style={th}>Tag</th>
                  <th style={th}>Classes</th>
                  <th style={th}>Text</th>
                  <th style={th}>color</th>
                  <th style={th}>bg</th>
                  <th style={th}>border</th>
                  <th style={th}>Selector</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((h, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={td}>{h.tag}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{h.classes}</td>
                    <td style={{ ...td, color: "#94a3b8" }}>{h.text}</td>
                    <td style={{ ...td, color: isAmberColor(h.color) ? "#F59E0B" : "#94a3b8" }}>{h.color}</td>
                    <td style={{ ...td, color: isAmberColor(h.bg) ? "#F59E0B" : "#94a3b8" }}>{h.bg}</td>
                    <td style={{ ...td, color: isAmberColor(h.border) ? "#F59E0B" : "#94a3b8" }}>{h.border}</td>
                    <td style={{ ...td, color: "#64748b", fontSize: 10 }}>{h.selector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="5. Side-by-side reference: mobile-shell-v2">
        <p style={{ color: "#94a3b8", marginBottom: 8 }}>
          Open the app shell skin source of truth in another tab to compare:
        </p>
        <a href="/preview/mobile-shell-v2" target="_blank" rel="noreferrer" style={{ color: "#5E8E8E", textDecoration: "underline" }}>
          /preview/mobile-shell-v2 →
        </a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "#151A23",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#e2e8f0" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "4px 0" }}>
      <span style={{ color: "#64748b", minWidth: 220 }}>{label}</span>
      <span style={{ color: "#e2e8f0" }}>{value}</span>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  color: "#94a3b8",
  fontWeight: 600,
  fontSize: 11,
};

const td: React.CSSProperties = {
  padding: "4px 8px",
  verticalAlign: "top",
};

const btnStyle: React.CSSProperties = {
  background: "#1e2533",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
