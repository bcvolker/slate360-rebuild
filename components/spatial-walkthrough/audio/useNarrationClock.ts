"use client";

import { useEffect, useRef } from "react";
import {
  mixVolumes,
  narrationMediaTime,
  segmentAtTime,
  type NarrationSegment,
} from "@/lib/spatial-walkthrough/audio";

type PlayerAudio = {
  setSourceMuted: (muted: boolean) => void;
  setSourceVolume: (volume: number) => void;
};

export function useNarrationClock(args: {
  segments: NarrationSegment[];
  clipId: string;
  t: number;
  playing: boolean;
  duckSource: boolean;
  sourceMuted: boolean;
  sourceVolume: number;
  player: PlayerAudio | null;
}): NarrationSegment | null {
  const { segments, clipId, t, playing, duckSource, sourceMuted, sourceVolume, player } = args;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const active = segmentAtTime(segments, clipId, t);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const url = active?.asset?.url;
    if (!active || !url) {
      el.pause();
      return;
    }
    if (el.dataset.seg !== active.id) {
      el.src = url;
      el.dataset.seg = active.id;
    }
    const media = narrationMediaTime(active, t);
    if (media == null) {
      el.pause();
      return;
    }
    if (Math.abs((el.currentTime || 0) - media) > 0.35) {
      el.currentTime = media;
    }
    el.volume = mixVolumes({
      sourceVolume,
      narrationVolume: active.volume,
      duckSource,
      narrationActive: true,
    }).narration;
    if (playing) void el.play().catch(() => undefined);
    else el.pause();
  }, [active, t, playing, duckSource, sourceVolume]);

  useEffect(() => {
    if (!player) return;
    const mix = mixVolumes({
      sourceVolume,
      narrationVolume: active?.volume ?? 0,
      duckSource,
      narrationActive: Boolean(active) && playing,
    });
    player.setSourceMuted(sourceMuted);
    player.setSourceVolume(sourceMuted ? 0 : mix.source);
  }, [player, sourceMuted, sourceVolume, duckSource, active, playing]);

  return active;
}
