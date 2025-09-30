"use client";

import { useEffect, useMemo, useState } from "react";

export default function DebugScrollOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const on = params.get("debugScroll") === "1";
    setEnabled(on);
    if (!on) return;
    const scrollContainer = document.getElementById("scroll-container");
    const handler = () => {
      const active = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2) as HTMLElement | null;
      setInfo({
        path: window.location.pathname + window.location.hash,
        isDesktop: window.matchMedia('(min-width: 768px)').matches,
        scrollContainerScrollTop: scrollContainer?.scrollTop ?? null,
        bodyScrollY: window.scrollY,
        containerSnap: scrollContainer ? getComputedStyle(scrollContainer).scrollSnapType : null,
        docSnap: getComputedStyle(document.documentElement).scrollSnapType,
        activeId: active?.closest('section')?.id ?? null,
      });
    };
    handler();
    document.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      document.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div style={{position:'fixed', bottom:8, left:8, right:8, zIndex:9999, pointerEvents:'none'}}>
      <div style={{fontFamily:'ui-monospace, SFMono-Regular', fontSize:12, background:'rgba(0,0,0,0.75)', color:'#0ff', padding:8, border:'1px solid #066', borderRadius:6}}>
        <div>DebugScroll</div>
        <pre style={{whiteSpace:'pre-wrap', margin:0}}>{JSON.stringify(info, null, 2)}</pre>
      </div>
    </div>
  );
}
