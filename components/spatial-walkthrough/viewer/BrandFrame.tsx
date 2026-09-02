"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
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
  sceneVisible?: boolean;
  visibleLayer?: "hero" | "geometry" | "reality";
  spaceName?: string | null;
  shareHref?: string | null;
  children: ReactNode;
};

export function BrandFrame({
  theme,
  title,
  projectName,
  capturedAt,
  loading = false,
  compact = false,
  sceneVisible = false,
  visibleLayer = "hero",
  spaceName = null,
  shareHref = null,
  children,
}: Props) {
  const style = themeCssVars(theme) as CSSProperties;
  const [chrome, setChrome] = useState<"active" | "idle">("active");
  const copy = viewerChromeCopy({ title, projectName, capturedAt, spaceName });

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
    <div className="sw-frame" data-compact={compact ? "true" : "false"} data-chrome={chrome} data-scene-visible={sceneVisible ? "true" : "false"} data-visible-layer={visibleLayer} style={style}>
      {loading ? (
        <div className="sw-buffer" role="status">
          <StatusCopy logoUrl={theme.logoUrl} title={copy.title} body="Loading walkthrough" />
        </div>
      ) : null}
      <header className="sw-frame-header">
        <ViewerBrandMark logoUrl={theme.logoUrl} opacity={theme.logoOpacity ?? 0.88} />
        <div className="sw-frame-meta">
          <strong>{copy.title}</strong>
          {copy.meta ? <span>{copy.meta}</span> : null}
        </div>
      </header>
      {compact ? null : (
        <div className="sw-frame-actions">
          {shareHref ? (
            <a className="sw-chrome-btn" href={shareHref} data-testid="sw-share">Share</a>
          ) : null}
          <details className="sw-more">
            <summary className="sw-chrome-btn">More</summary>
            <p className="sw-more-copy">Look around. Use Path to jump stations.</p>
          </details>
        </div>
      )}
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
      <p className="sw-status-kicker">Walkthrough</p>
      <h2>{title}</h2>
      <p className="sw-status-body">{body}</p>
    </div>
  );
}
