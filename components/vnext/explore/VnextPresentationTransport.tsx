"use client";

import { pathIsPlayable, playbackModelMatches } from "@/lib/vnext/views/playback-state";
import { useVnextPlayback } from "./VnextPlayback";

const control =
  "h-11 min-w-[44px] border border-[var(--vnext-line)] bg-[var(--vnext-canvas)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

export function VnextPresentationTransport({ present }: { present: boolean }) {
  const { session, activeModelId, play, pause, restart } = useVnextPlayback();
  if (!present || !session || !activeModelId) return null;
  if (!playbackModelMatches(session.modelId, activeModelId) || !pathIsPlayable(session.path)) return null;
  return (
    <div
      className="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5"
      data-vnext-presentation-playback="true"
    >
      <button type="button" className={control} onClick={play} data-vnext-path-play="true">
        Play
      </button>
      <button type="button" className={control} onClick={pause} data-vnext-path-pause="true">
        Pause
      </button>
      <button type="button" className={control} onClick={restart} data-vnext-path-restart="true">
        Restart
      </button>
    </div>
  );
}
