"use client";

import { useSearchParams } from "next/navigation";
import { CompareAuthor } from "./CompareAuthor";
import { CompareDatePair } from "./CompareDatePair";
import { CompareFlip } from "./CompareFlip";
import { CompareIssueBar } from "./CompareIssueBar";
import { CompareModeBar } from "./CompareModeBar";
import { CompareOverlay } from "./CompareOverlay";
import { CompareSplit } from "./CompareSplit";
import { CompareSwipe } from "./CompareSwipe";
import { useCompareSession } from "./useCompareSession";
import { APPROXIMATE_COPY } from "@/lib/spatial-walkthrough/compare-overlay";
import type { CompareMode } from "@/lib/spatial-walkthrough/compare-mode";
import "./spatial-compare.css";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

const SCENE_MODE: Record<string, CompareMode> = {
  split: "split",
  swipe: "swipe",
  overlay: "overlay",
  flip: "flip",
  author: "split",
  "flip-mobile": "flip",
  "swipe-mobile": "swipe",
  "stack-mobile": "stack",
};

export function SpatialComparePreview() {
  const scene = useSearchParams()?.get("scene") ?? "split";
  const compact = scene.includes("mobile");
  const session = useCompareSession(compact, SCENE_MODE[scene] ?? "split");
  const before = { ...session.beforeMeta, locator: session.before };
  const after = { ...session.afterMeta, locator: session.after };
  const authoring = scene === "author";

  return (
    <div className="sw-compare" data-compact={compact ? "true" : "false"} data-scene={scene}>
      <header className="sw-compare-toolbar">
        <div>
          <p className="sw-compare-kicker">Temporal compare</p>
          <h1 className="sw-compare-title">Construction hallway</h1>
        </div>
        <CompareDatePair pairs={session.pairs} selected={session.pair} onSelect={session.setPair} />
        <CompareModeBar modes={session.modes} mode={session.mode} onMode={session.setMode} />
      </header>
      <div className="sw-compare-stage">
        {session.mode === "split" ? (
          <CompareSplit before={before} after={after} onBeforeLook={session.look} />
        ) : null}
        {session.mode === "stack" ? (
          <CompareSplit stack before={before} after={after} onBeforeLook={session.look} />
        ) : null}
        {session.mode === "swipe" ? (
          <CompareSwipe before={before} after={after} percent={session.swipe} onPercent={session.setSwipe} onBeforeLook={session.look} />
        ) : null}
        {session.mode === "overlay" ? (
          <CompareOverlay before={before} after={after} opacity={session.opacity} gate={session.gate} onBeforeLook={session.look} />
        ) : null}
        {session.mode === "flip" ? (
          <CompareFlip before={before} after={after} showingAfter={session.showingAfter} onShowingAfter={session.setShowingAfter} onBeforeLook={session.look} />
        ) : null}
        {session.mode === "split" || session.mode === "swipe" || session.mode === "stack" ? (
          <p className="sw-compare-approx">{APPROXIMATE_COPY}</p>
        ) : null}
      </div>
      <footer className="sw-compare-footer">
        <label className="sw-compare-scrub">
          Scrub mapped anchors
          <input
            type="range"
            min={0}
            max={session.duration}
            step={0.25}
            value={session.before.tSeconds}
            onChange={(e) => session.scrub(Number(e.target.value))}
          />
          <span>{session.before.tSeconds.toFixed(0)}s{session.mapped?.interpolated ? " · interpolated" : ""}</span>
        </label>
        {session.mode === "overlay" && session.gate.enabled ? (
          <label className="sw-compare-scrub">
            After opacity
            <input type="range" min={0.1} max={0.9} step={0.05} value={session.opacity} onChange={(e) => session.setOpacity(Number(e.target.value))} />
          </label>
        ) : null}
      </footer>
      {authoring ? (
        <CompareAuthor anchors={session.anchors} candidates={session.candidates} onMatch={session.proposeMatch} onConfirm={session.confirmMatch} />
      ) : null}
      <CompareIssueBar issues={session.issues} onSelect={session.setIssue} />
    </div>
  );
}
