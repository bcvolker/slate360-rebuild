"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WalkthroughExperience } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { NarrationAuthorPanel } from "@/components/spatial-walkthrough/studio/NarrationAuthorPanel";
import { VoiceNoteAuthor } from "@/components/spatial-walkthrough/studio/VoiceNoteAuthor";
import { PREVIEW_PATCH, PREVIEW_THEME, PREVIEW_WAYPOINTS } from "@/lib/spatial-walkthrough/preview-fixtures";
import {
  HOUSEWALK_CHAPTERS,
  HOUSEWALK_CLIP_ID,
  HOUSEWALK_NARRATION,
  HOUSEWALK_TITLE,
  HOUSEWALK_TRANSCRIPTS,
  HOUSEWALK_VOICE,
} from "@/lib/spatial-walkthrough/housewalk-audio";
import { dragSegment, type NarrationSegment } from "@/lib/spatial-walkthrough/audio";
import type { ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import type { NavMode } from "@/lib/spatial-walkthrough/nav-mode";

const PINS: ExperiencePin[] = [
  {
    id: "pin-voice",
    label: "Field voice note",
    pinType: "voice",
    body: "Recorded on the corridor hold.",
    yawDeg: 22,
    pitchDeg: -8,
    tSeconds: 16,
    attachments: [{
      id: "att-voice",
      kind: "audio",
      title: "Corridor hold",
      audioUrl: HOUSEWALK_VOICE.asset?.url ?? null,
    }],
  },
  {
    id: "pin-doc",
    label: "AHU-3 submittal",
    pinType: "document",
    body: "Approved mechanical submittal.",
    yawDeg: -14,
    pitchDeg: -8,
    tSeconds: 18,
    attachments: [{ id: "a1", kind: "slatedrop", title: "AHU-3.pdf", fileName: "AHU-3.pdf" }],
  },
];

function SpatialAudioPreview() {
  const params = useSearchParams();
  const view = params?.get("view") ?? "briefing";
  const [segments, setSegments] = useState<NarrationSegment[]>(HOUSEWALK_NARRATION);
  const mode: NavMode = view === "briefing" || view === "transcript" ? "briefing" : view === "controls" ? "play" : "explore";
  const openVoice = view === "voice-pin";
  const title = useMemo(() => {
    if (view === "transcript") return "Transcript";
    if (view === "voice-pin") return "Voice pin";
    if (view === "timeline") return "Timeline narration";
    if (view === "controls") return "Source and narration";
    if (view === "authoring") return "Narration authoring";
    return "Guided Briefing";
  }, [view]);

  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
      <p className="px-4 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
        Spatial Walkthrough · {title}
      </p>
      <div className="h-[70vh] lg:h-[78vh]">
        <WalkthroughExperience
          theme={PREVIEW_THEME}
          title={HOUSEWALK_TITLE}
          clipId={HOUSEWALK_CLIP_ID}
          duration={42}
          waypoints={PREVIEW_WAYPOINTS.map((w) => ({ ...w, clipId: HOUSEWALK_CLIP_ID }))}
          pins={PINS}
          redactions={[]}
          operatorPatch={PREVIEW_PATCH}
          preview
          capturedAt="2026-08-12T00:00:00.000Z"
          projectName={HOUSEWALK_TITLE}
          selectedId={openVoice ? "pin-voice" : null}
          initialMode={mode}
          forceHud
          narration={segments}
          transcripts={HOUSEWALK_TRANSCRIPTS}
          chapters={HOUSEWALK_CHAPTERS}
          authoringAudio={view === "authoring" || view === "timeline"}
          transcriptOpen={view === "transcript"}
        />
      </div>
      {view === "authoring" || view === "timeline" ? (
        <div className="mx-auto max-w-3xl space-y-3 p-4">
          <NarrationAuthorPanel
            walkthroughId="wt-housewalk"
            clipId={HOUSEWALK_CLIP_ID}
            duration={42}
            currentT={4}
            segments={segments}
            onRefresh={() => undefined}
            onDrag={(id, delta) => {
              setSegments((list) => list.map((s) => (s.id === id ? dragSegment(s, delta, 42) : s)));
            }}
          />
          <VoiceNoteAuthor walkthroughId="wt-housewalk" clipId={HOUSEWALK_CLIP_ID} t={16} yaw={22} pitch={-8} onRefresh={() => undefined} />
        </div>
      ) : null}
    </div>
  );
}

export default function SpatialAudioPreviewPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--graphite-muted)]">Loading…</p>}>
      <SpatialAudioPreview />
    </Suspense>
  );
}
