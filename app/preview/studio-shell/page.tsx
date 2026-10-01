"use client";

import { PrivacyInspector } from "@/components/spatial-walkthrough/studio/PrivacyInspector";
import { DEFAULT_OPERATOR_PATCH } from "@/lib/spatial-walkthrough/types";
import "@/components/spatial-walkthrough/studio/studio-frame.css";

const HERO =
  "/api/spatial-walkthrough/public/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/media?clip=f278d37f-1c2f-4511-aef5-437b3992d39d&kind=hero";

export default function StudioShellPreview() {
  return (
    <div className="sw-studio" data-testid="studio-preview">
      <div className="sw-studio-top">
        <span className="text-sm text-[var(--graphite-muted)]">Back</span>
        <strong>HouseWalk</strong>
        <span className="text-sm">Save · Preview · Publish</span>
      </div>
      <aside className="sw-studio-rail">
        {["Capture", "Spaces", "Path", "Pins", "Privacy", "Narration", "Publish"].map((tool) => (
          <p key={tool} className="sw-studio-tool" data-on={tool === "Privacy" ? "true" : "false"}>{tool}</p>
        ))}
      </aside>
      <div className="sw-studio-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO} alt="" className="h-full w-full object-cover" />
      </div>
      <aside className="sw-studio-inspector">
        <PrivacyInspector
          patch={DEFAULT_OPERATOR_PATCH}
          onChange={() => undefined}
          onPersist={() => undefined}
          onMaskHere={() => undefined}
        />
      </aside>
      <div className="sw-studio-timeline text-sm text-[var(--graphite-muted)]">Play · 0:00 / 0:58 · privacy keys</div>
    </div>
  );
}
