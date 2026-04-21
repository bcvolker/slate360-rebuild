"use client";

/**
 * On-screen mobile diagnostic. Hit `/m/diag` from the iPhone to see
 * EXACTLY what's wrong without needing devtools:
 *   - viewport size vs document scrollWidth (horizontal overflow detector)
 *   - service worker version + cache list (stale-cache detector)
 *   - PWA install state + beforeinstallprompt seen
 *   - camera permission state + getUserMedia probe
 *   - colour swatches (background lightness check)
 *
 * No analytics, no auth — pure read-only client probe.
 */

import { useEffect, useState } from "react";

type Probe = {
  innerW: number;
  innerH: number;
  visualW: number;
  visualH: number;
  docScrollW: number;
  bodyScrollW: number;
  hasHorizontalScroll: boolean;
  widestEl: { tag: string; cls: string; w: number } | null;
  swController: string | null;
  swReg: string | null;
  caches: string[];
  standalone: boolean;
  installEventSeen: boolean;
  cameraState: string;
};

export default function MobileDiag() {
  const [probe, setProbe] = useState<Probe | null>(null);
  const [installSeen, setInstallSeen] = useState(false);

  useEffect(() => {
    const handler = () => setInstallSeen(true);
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      const visualW = window.visualViewport?.width ?? innerW;
      const visualH = window.visualViewport?.height ?? innerH;
      const docScrollW = document.documentElement.scrollWidth;
      const bodyScrollW = document.body.scrollWidth;
      const hasHorizontalScroll = docScrollW > innerW + 1;

      let widest: { tag: string; cls: string; w: number } | null = null;
      if (hasHorizontalScroll) {
        const all = document.body.querySelectorAll<HTMLElement>("*");
        all.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > innerW + 1 && (!widest || r.right > widest.w)) {
            widest = {
              tag: el.tagName.toLowerCase(),
              cls: (el.className || "").toString().slice(0, 80),
              w: Math.round(r.right),
            };
          }
        });
      }

      const swController = navigator.serviceWorker?.controller?.scriptURL ?? null;
      let swReg: string | null = null;
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        swReg = reg?.active?.scriptURL ?? null;
      } catch {
        /* ignore */
      }

      let cacheNames: string[] = [];
      try {
        cacheNames = "caches" in window ? await caches.keys() : [];
      } catch {
        /* ignore */
      }

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

      let cameraState = "unknown";
      try {
        const perm = await (navigator.permissions as unknown as {
          query?: (q: { name: string }) => Promise<{ state: string }>;
        }).query?.({ name: "camera" });
        cameraState = perm?.state ?? "n/a";
      } catch {
        cameraState = "permissions-api-unavailable";
      }

      if (!cancelled) {
        setProbe({
          innerW,
          innerH,
          visualW: Math.round(visualW),
          visualH: Math.round(visualH),
          docScrollW,
          bodyScrollW,
          hasHorizontalScroll,
          widestEl: widest,
          swController,
          swReg,
          caches: cacheNames,
          standalone,
          installEventSeen: installSeen,
          cameraState,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [installSeen]);

  async function nukeCaches() {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.unregister();
      alert("Caches cleared + SW unregistered. Close ALL tabs and reopen.");
    } catch (e) {
      alert("Failed: " + String(e));
    }
  }

  async function probeCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const tracks = s.getVideoTracks();
      const settings = tracks[0]?.getSettings();
      alert(
        `Camera OK\nLabel: ${tracks[0]?.label ?? "?"}\nResolution: ${settings?.width ?? "?"}x${settings?.height ?? "?"}`,
      );
      tracks.forEach((t) => t.stop());
    } catch (e) {
      alert("Camera FAILED: " + String(e));
    }
  }

  if (!probe) return <div className="p-4 text-white">Probing…</div>;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white p-4 space-y-4 text-sm font-mono">
      <h1 className="text-xl font-bold">Slate360 Mobile Diagnostic</h1>
      <p className="text-xs text-slate-400">
        Built {new Date().toISOString()} · share this screenshot if anything is RED.
      </p>

      <Section title="Viewport">
        <Row k="innerWidth" v={`${probe.innerW}px`} />
        <Row k="visualViewport.width" v={`${probe.visualW}px`} />
        <Row k="documentElement.scrollWidth" v={`${probe.docScrollW}px`} bad={probe.hasHorizontalScroll} />
        <Row k="body.scrollWidth" v={`${probe.bodyScrollW}px`} bad={probe.bodyScrollW > probe.innerW + 1} />
        <Row k="HORIZONTAL OVERFLOW" v={probe.hasHorizontalScroll ? "YES — BUG" : "no"} bad={probe.hasHorizontalScroll} />
        {probe.widestEl && (
          <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded">
            <div className="text-red-300 font-bold">Culprit element:</div>
            <div className="text-xs">tag: {probe.widestEl.tag}</div>
            <div className="text-xs break-all">class: {probe.widestEl.cls}</div>
            <div className="text-xs">extends to: {probe.widestEl.w}px</div>
          </div>
        )}
      </Section>

      <Section title="Service Worker">
        <Row k="controller" v={probe.swController ?? "none"} />
        <Row k="registration" v={probe.swReg ?? "none"} />
        <Row k="cache count" v={String(probe.caches.length)} />
        {probe.caches.map((c) => (
          <div key={c} className="text-xs text-slate-400 ml-2">· {c}</div>
        ))}
        <button
          onClick={nukeCaches}
          className="mt-2 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold"
        >
          NUKE all caches + unregister SW
        </button>
      </Section>

      <Section title="PWA / Install">
        <Row k="display-mode: standalone" v={probe.standalone ? "yes" : "no"} />
        <Row k="beforeinstallprompt fired" v={probe.installEventSeen ? "yes" : "no"} />
      </Section>

      <Section title="Camera">
        <Row k="permission state" v={probe.cameraState} />
        <button
          onClick={probeCamera}
          className="mt-2 px-3 py-2 rounded-lg bg-cobalt text-white text-xs font-bold"
        >
          Probe camera (getUserMedia)
        </button>
      </Section>

      <Section title="Background swatch">
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <Swatch hex="#0B0F15" name="OLD bg" />
          <Swatch hex="#131A24" name="NEW bg" />
          <Swatch hex="#0F141C" name="NEW card" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <h2 className="text-xs uppercase tracking-wider text-cobalt mb-2 font-bold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className={`flex justify-between text-xs ${bad ? "text-red-400 font-bold" : "text-slate-200"}`}>
      <span className="text-slate-400">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function Swatch({ hex, name }: { hex: string; name: string }) {
  return (
    <div>
      <div className="h-12 rounded border border-white/20" style={{ background: hex }} />
      <div className="mt-1 text-center">{name}</div>
      <div className="text-center text-slate-500">{hex}</div>
    </div>
  );
}
