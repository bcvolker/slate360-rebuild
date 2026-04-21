"use client";

/**
 * OverflowProbe — diagnostic overlay that finds the actual element causing
 * horizontal overflow on the current page. Activate by adding `?probe=1`
 * to any URL (e.g. /dashboard?probe=1). Shows live readout of:
 *   - viewport width vs document scrollWidth
 *   - the SINGLE widest element extending past the viewport (tag + classes)
 * Re-scans every 500ms so you can navigate, rotate, or scroll and watch.
 *
 * This is the only reliable way to debug iOS Safari "wiggle" without devtools.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Hit = {
  tag: string;
  cls: string;
  id: string;
  w: number;
  right: number;
  left: number;
};

type Probe = {
  innerW: number;
  visualW: number;
  docScrollW: number;
  bodyScrollW: number;
  offenders: Hit[];
};

export default function OverflowProbe() {
  const params = useSearchParams();
  const enabled = params?.get("probe") === "1";
  const [probe, setProbe] = useState<Probe | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measure = () => {
      const innerW = window.innerWidth;
      const visualW = Math.round(window.visualViewport?.width ?? innerW);
      const docScrollW = document.documentElement.scrollWidth;
      const bodyScrollW = document.body.scrollWidth;

      const offenders: Hit[] = [];
      const all = document.body.querySelectorAll<HTMLElement>("*");
      all.forEach((el) => {
        // Skip our own overlay
        if (el.closest("[data-overflow-probe]")) return;
        const r = el.getBoundingClientRect();
        if (r.right > innerW + 1 || r.left < -1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || "").toString().slice(0, 120),
            id: el.id || "",
            w: Math.round(r.width),
            right: Math.round(r.right),
            left: Math.round(r.left),
          });
        }
      });

      // Sort by widest extension past the right edge
      offenders.sort((a, b) => b.right - a.right);

      setProbe({
        innerW,
        visualW,
        docScrollW,
        bodyScrollW,
        offenders: offenders.slice(0, 8),
      });
    };

    measure();
    const id = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [enabled]);

  if (!enabled || !probe) return null;

  const overflowing =
    probe.docScrollW > probe.innerW + 1 || probe.bodyScrollW > probe.innerW + 1;

  return (
    <div
      data-overflow-probe
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 999999,
        maxHeight: "45vh",
        overflowY: "auto",
        background: overflowing ? "rgba(220, 38, 38, 0.95)" : "rgba(16, 185, 129, 0.95)",
        color: "white",
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        lineHeight: 1.35,
        padding: 10,
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {overflowing ? "🚨 OVERFLOW DETECTED" : "✅ NO OVERFLOW"}
      </div>
      <div>innerW: {probe.innerW}px · visualW: {probe.visualW}px</div>
      <div>doc.scrollW: {probe.docScrollW}px · body.scrollW: {probe.bodyScrollW}px</div>
      {overflowing && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 700 }}>Widest offenders:</div>
          {probe.offenders.length === 0 && <div>(none found — check fixed/absolute elements)</div>}
          {probe.offenders.map((o, i) => (
            <div key={i} style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <div>
                <strong>{o.tag}</strong>
                {o.id ? ` #${o.id}` : ""} — w={o.w}px · L={o.left} · R={o.right}
              </div>
              <div style={{ wordBreak: "break-all", opacity: 0.85 }}>{o.cls}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
