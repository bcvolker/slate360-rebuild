"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourPanoViewer } from "./TourPanoViewer";

interface Scene {
  id: string;
  title: string;
  panorama_path: string;
  thumbnail_path: string | null;
  initial_yaw: number | null;
  initial_pitch: number | null;
  sort_order: number;
}

interface Tour {
  id: string;
  title: string;
  description: string | null;
  viewer_slug: string | null;
  logo_asset_path: string | null;
  logo_width_percent: number | null;
  logo_opacity: number | null;
  logo_position: string | null;
}

interface PublicTourViewerProps {
  tour: Tour;
  scenes: Scene[];
}

export function PublicTourViewer({ tour, scenes }: PublicTourViewerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const scene = scenes[currentIdx];

  if (!scene) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p>This tour has no scenes yet.</p>
      </div>
    );
  }

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < scenes.length - 1;

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Panorama viewer */}
      <TourPanoViewer
        src={scene.panorama_path}
        initialYaw={scene.initial_yaw ?? 0}
        initialPitch={scene.initial_pitch ?? 0}
      />

      {/* Tour title overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <h1 className="text-lg font-bold text-white drop-shadow-lg">{tour.title}</h1>
        {scenes.length > 1 && (
          <p className="text-sm text-white/70 drop-shadow">
            {scene.title} — {currentIdx + 1} / {scenes.length}
          </p>
        )}
      </div>

      {/* Navigation controls */}
      {scenes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-black/50 text-white hover:bg-black/70"
            disabled={!hasPrev}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            <ChevronLeft className="size-5" />
          </Button>

          {/* Scene dots */}
          <div className="flex gap-1.5">
            {scenes.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentIdx(idx)}
                className={`size-2.5 rounded-full transition ${
                  idx === currentIdx
                    ? "bg-white"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-black/50 text-white hover:bg-black/70"
            disabled={!hasNext}
            onClick={() => setCurrentIdx((i) => i + 1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}

      {/* Branding logo */}
      {tour.logo_asset_path && (
        <div
          className="absolute z-10"
          style={{
            ...(tour.logo_position === "top-right"
              ? { top: 16, right: 16 }
              : tour.logo_position === "bottom-left"
                ? { bottom: 16, left: 16 }
                : tour.logo_position === "bottom-right"
                  ? { bottom: 16, right: 16 }
                  : { top: 16, left: 16 }),
          }}
        >
          <img
            src={tour.logo_asset_path}
            alt="Tour branding"
            className="pointer-events-none"
            style={{
              width: `${tour.logo_width_percent ?? 15}%`,
              opacity: tour.logo_opacity ?? 0.8,
              maxWidth: 200,
            }}
          />
        </div>
      )}

      {/* Powered by */}
      <div className="absolute bottom-2 right-4 z-10 text-[10px] text-white/30">
        Powered by Slate360
      </div>
    </div>
  );
}
