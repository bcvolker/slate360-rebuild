"use client";

import { useMemo, useState } from "react";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import type { NarrationSegment, TranscriptRecord, VoiceNoteRecord } from "@/lib/spatial-walkthrough/audio";
import { allPhrases, activePhrase } from "@/lib/spatial-walkthrough/transcript";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import { useNarrationClock } from "./useNarrationClock";
import { AudioControls } from "./AudioControls";
import { NarrationLane } from "./NarrationLane";
import { TranscriptDrawer } from "./TranscriptDrawer";
import { GuidedBriefing } from "./GuidedBriefing";

type PinLike = { id: string; label: string; tSeconds: number | null; yawDeg: number; pitchDeg: number };

type Props = {
  clipId: string;
  duration: number;
  t: number;
  playing: boolean;
  player: WalkthroughPlayerHandle | null;
  segments: NarrationSegment[];
  transcripts: TranscriptRecord[];
  chapters?: ChapterRecord[];
  pins: PinLike[];
  voiceNotes?: VoiceNoteRecord[];
  authoring?: boolean;
  onSelectPin: (id: string) => void;
  onDragSegment?: (id: string, deltaS: number) => void;
  onInterrupt?: (kind: "briefing.interrupt" | "briefing.resume" | "document.opened") => void;
  briefing?: boolean;
  transcriptOpenDefault?: boolean;
};

export function WalkthroughAudioLayer({
  clipId,
  duration,
  t,
  playing,
  player,
  segments,
  transcripts,
  chapters = [],
  pins,
  authoring = false,
  onSelectPin,
  onDragSegment,
  onInterrupt,
  briefing = false,
  transcriptOpenDefault = false,
}: Props) {
  const [sourceMuted, setSourceMuted] = useState(true);
  const [duckSource, setDuckSource] = useState(true);
  const [sourceVolume, setSourceVolume] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(transcriptOpenDefault);
  const [interrupted, setInterrupted] = useState(false);

  const active = useNarrationClock({
    segments,
    clipId,
    t,
    playing,
    duckSource,
    sourceMuted,
    sourceVolume,
    player,
  });

  const phrases = useMemo(() => allPhrases(transcripts), [transcripts]);
  const phrase = activePhrase(phrases, t);
  const chapter = chapters.find((c) => c.clipId === clipId && t >= c.startTime && t < c.endTime) ?? null;
  const pin = active?.pinId ? pins.find((p) => p.id === active.pinId) : null;

  const pauseBriefing = () => {
    player?.pause();
    setInterrupted(true);
    onInterrupt?.("briefing.interrupt");
  };
  const resumeBriefing = () => {
    setInterrupted(false);
    player?.play();
    onInterrupt?.("briefing.resume");
  };

  return (
    <>
      <div className="sw-audio-dock">
        <NarrationLane
          segments={segments}
          clipId={clipId}
          duration={duration}
          activeId={active?.id ?? null}
          authoring={authoring}
          onSelect={(id) => {
            const s = segments.find((x) => x.id === id);
            if (s) player?.seekTo(s.startTime);
          }}
          onDrag={onDragSegment}
        />
        <AudioControls
          sourceMuted={sourceMuted}
          duckSource={duckSource}
          sourceVolume={sourceVolume}
          narrationActive={Boolean(active)}
          onSourceMuted={setSourceMuted}
          onDuckSource={setDuckSource}
          onSourceVolume={setSourceVolume}
          onOpenTranscript={() => setTranscriptOpen(true)}
        />
      </div>
      <GuidedBriefing
        visible={briefing}
        segment={active}
        chapter={chapter}
        phrase={phrase}
        t={t}
        duration={duration}
        pinLabel={pin?.label ?? null}
        interrupted={interrupted}
        onPause={pauseBriefing}
        onResume={resumeBriefing}
        onOpenPin={pin ? () => {
          pauseBriefing();
          onSelectPin(pin.id);
          onInterrupt?.("document.opened");
        } : undefined}
      />
      <TranscriptDrawer
        open={transcriptOpen}
        records={transcripts}
        t={t}
        onClose={() => setTranscriptOpen(false)}
        onSeek={(p) => {
          const linked = pins.find((x) => Math.abs((x.tSeconds ?? -999) - p.start) < 1.5);
          player?.seekTo(p.start, linked?.yawDeg, linked?.pitchDeg);
          if (linked) onSelectPin(linked.id);
        }}
      />
    </>
  );
}

export type { VoiceNoteRecord };
