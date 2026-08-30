"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { BrandTheme } from "@/lib/spatial-walkthrough/types";
import { themeCssVars } from "@/lib/spatial-walkthrough/theme";
import { viewerChromeCopy } from "@/lib/spatial-walkthrough/viewer-title";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";
import "@/components/spatial-walkthrough/viewer/walkthrough-markers.css";

type Props = {
  theme: BrandTheme;
  title: string;
  projectName?: string | null;
  capturedAt?: string | null;
  loading?: boolean;
  compact?: boolean;
  children: ReactNode;
};

export function BrandFrame({
  theme,
  title,
  projectName,
  capturedAt,
  loading = false,
  compact = false,
  children,
}: Props) {
  const style = themeCssVars(theme) as CSSProperties;
  const [chrome, setChrome] = useState<"active" | "idle">("active");
  const copy = viewerChromeCopy({ title, projectName, capturedAt });

  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setChrome("active");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChrome("idle"), 2800);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  return (
    <div className="sw-frame" data-compact={compact ? "true" : "false"} data-chrome={chrome} style={style}>
      {loading ? (
        <div className="sw-buffer" role="status">
          <StatusCopy logoUrl={theme.logoUrl} title={copy.title} body="Loading Spatial Walkthrough" />
        </div>
      ) : null}
      <header className="sw-frame-header">
        {theme.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoUrl} alt="" className={`sw-logo--${theme.logoTreatment}`} />
        ) : (
          <span className="sw-frame-kicker">Spatial</span>
        )}
        <div className="sw-frame-meta">
          <strong>{copy.title}</strong>
          {copy.meta ? <span>{copy.meta}</span> : null}
        </div>
        {theme.showPoweredBy ? (
          <span className="sw-frame-credit">Slate360</span>
        ) : null}
      </header>
      <div className="sw-frame-stage">{children}</div>
    </div>
  );
}

function StatusCopy({ logoUrl, title, body }: { logoUrl: string | null; title: string; body: string }) {
  return (
    <div className="sw-status">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="mx-auto mb-3 h-8 w-auto max-w-[180px] object-contain" />
      ) : null}
      <p className="sw-status-kicker">Spatial Walkthrough</p>
      <h2>{title}</h2>
      <p className="sw-status-body">{body}</p>
    </div>
  );
}
