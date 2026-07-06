"use client";

import { useEffect, useState } from "react";
import { Loader2, ImageIcon, AlertTriangle } from "lucide-react";
import type { TourSceneRow, SceneStatus } from "./TourStudioWorkspace";

export function StatusChip({ status }: { status: SceneStatus }) {
  if (status === "ready") return null;
  const map: Record<Exclude<SceneStatus, "ready">, { label: string; cls: string; icon: React.ReactNode }> = {
    uploading: { label: "Uploading", cls: "text-sky-300", icon: <Loader2 className="size-3 animate-spin" /> },
    processing: { label: "Processing", cls: "text-[var(--graphite-primary)]", icon: <Loader2 className="size-3 animate-spin" /> },
    failed: { label: "Failed", cls: "text-red-400", icon: <AlertTriangle className="size-3" /> },
  };
  const m = map[status];
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${m.cls}`}>{m.icon}{m.label}</span>
  );
}

/** Lazy thumbnail that resolves a signed URL only once the scene is ready. */
export function SceneThumb({
  scene, resolveImageUrl, className = "",
}: {
  scene: TourSceneRow;
  resolveImageUrl: (sceneId: string, variant: "full" | "thumbnail") => Promise<string | null>;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (scene.status === "ready") {
      resolveImageUrl(scene.id, "thumbnail").then((u) => { if (alive) setUrl(u); });
    }
    return () => { alive = false; };
  }, [scene.id, scene.status, resolveImageUrl]);

  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-md bg-[var(--graphite-canvas-deep)] ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={scene.title} className="h-full w-full object-cover" />
      ) : scene.status === "ready" ? (
        <Loader2 className="size-4 animate-spin text-[var(--graphite-muted)]" />
      ) : (
        <ImageIcon className="size-5 text-[var(--graphite-muted)]" />
      )}
    </div>
  );
}
