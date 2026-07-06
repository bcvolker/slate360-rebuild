"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicTourPanoViewer } from "./PublicTourPanoViewer";
import { PlanSheetTourViewer } from "./plan-tour/PlanSheetTourViewer";
import type { PublicTourSummary, SceneRuntime } from "@/lib/types/tours";

interface PublicTourViewerProps {
  slug: string;
  summary: PublicTourSummary;
}

export function PublicTourViewer({ slug, summary }: PublicTourViewerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sceneRuntime, setSceneRuntime] = useState<SceneRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const scene = summary.scenes[currentIdx];

  const loadScene = useCallback(
    async (sceneId: string) => {
      setLoading(true);
      setSceneRuntime(null);
      try {
        const res = await fetch(`/api/tours/public/${slug}/scenes/${sceneId}`);
        if (res.ok) {
          const json = await res.json();
          setSceneRuntime((json?.data ?? json) as SceneRuntime);
        }
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    // Plan-sheet tours render PlanSheetTourViewer instead (below) and load
    // scenes lazily per pin-dive, not eagerly here.
    if (scene && !summary.planTour) void loadScene(scene.id);
  }, [scene, loadScene, summary.planTour]);

  if (summary.planTour) {
    return <PlanSheetTourViewer planTour={summary.planTour} slug={slug} tourTitle={summary.title} />;
  }

  if (!scene) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-foreground">
        <p>This tour has no scenes yet.</p>
      </div>
    );
  }

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < summary.scenes.length - 1;

  return (
    <div className="relative h-screen w-full bg-black">
      {sceneRuntime ? (
        <PublicTourPanoViewer scene={sceneRuntime} />
      ) : (
        <div className="flex h-full items-center justify-center text-foreground/60">
          {loading ? "Loading…" : "Unable to load this scene."}
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <h1 className="text-lg font-bold text-foreground drop-shadow-lg">{summary.title}</h1>
        {summary.scenes.length > 1 && (
          <p className="text-sm text-foreground/70 drop-shadow">
            {scene.title} — {currentIdx + 1} / {summary.scenes.length}
          </p>
        )}
      </div>

      {summary.scenes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="bg-black/50 text-foreground hover:bg-black/70"
            disabled={!hasPrev}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex gap-1.5">
            {summary.scenes.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentIdx(idx)}
                aria-label={`Go to scene ${idx + 1}: ${s.title}`}
                className={`size-2.5 rounded-sm transition ${
                  idx === currentIdx ? "bg-white" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            size="icon"
            className="bg-black/50 text-foreground hover:bg-black/70"
            disabled={!hasNext}
            onClick={() => setCurrentIdx((i) => i + 1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}

      {summary.branding.logoUrl && (
        <div
          className="absolute z-10"
          style={{
            ...(summary.branding.logoPosition === "top-right"
              ? { top: 16, right: 16 }
              : summary.branding.logoPosition === "bottom-left"
                ? { bottom: 16, left: 16 }
                : summary.branding.logoPosition === "bottom-right"
                  ? { bottom: 16, right: 16 }
                  : { top: 16, left: 16 }),
          }}
        >
          <img
            src={summary.branding.logoUrl}
            alt="Tour branding"
            className="pointer-events-none"
            style={{
              width: `${summary.branding.logoWidthPercent ?? 15}%`,
              opacity: summary.branding.logoOpacity ?? 0.8,
              maxWidth: 200,
            }}
          />
        </div>
      )}

      <div className="absolute bottom-2 right-4 z-10 text-[10px] text-foreground/30">Powered by Slate360</div>
    </div>
  );
}
