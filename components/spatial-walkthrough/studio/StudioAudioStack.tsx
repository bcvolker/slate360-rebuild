"use client";

import { NarrationAuthorPanel } from "./NarrationAuthorPanel";
import { VoiceNoteAuthor } from "./VoiceNoteAuthor";
import type { NarrationSegment, TranscriptRecord } from "@/lib/spatial-walkthrough/audio";

export function StudioAudioStack(props: {
  walkthroughId: string;
  clipId: string;
  duration: number;
  currentT: number;
  yaw: number;
  pitch: number;
  segments: NarrationSegment[];
  onRefresh: () => void;
  onDrag: (id: string, delta: number) => void;
}) {
  return (
    <>
      <NarrationAuthorPanel
        walkthroughId={props.walkthroughId}
        clipId={props.clipId}
        duration={props.duration}
        currentT={props.currentT}
        segments={props.segments}
        onRefresh={props.onRefresh}
        onDrag={props.onDrag}
      />
      <VoiceNoteAuthor
        walkthroughId={props.walkthroughId}
        clipId={props.clipId}
        t={props.currentT}
        yaw={props.yaw}
        pitch={props.pitch}
        onRefresh={props.onRefresh}
      />
    </>
  );
}
