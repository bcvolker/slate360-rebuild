"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { LiDARCapture, type TwinCaptureManifest } from "@/src/plugins/LiDARCapture";
import type { TwinCaptureFinishResult } from "./TwinCaptureScreen";

type Props = {
  onFinish: (result: TwinCaptureFinishResult) => void | Promise<void>;
  onCancel: () => void;
};

/** Reads a native file:// URI into a File object via the Capacitor web-accessible URL.
 *  NOTE (V1): this loads the file into the JS heap. Fine for short test captures; large
 *  MP4s should move to native multipart upload (Week-2 hardening). */
async function uriToFile(uri: string, name: string, type: string): Promise<File> {
  const src = Capacitor.convertFileSrc(uri);
  const blob = await fetch(src).then((r) => r.blob());
  return new File([blob], name, { type });
}

/**
 * Native-led Twin capture launcher (iOS LiDAR devices only). Presents the native ARKit
 * capture screen, then converts the returned manifest into the same TwinCaptureFinishResult
 * the web capture path produces — so review/upload/Modal-bypass are unchanged.
 */
export function TwinNativeCaptureLauncher({ onFinish, onCancel }: Props) {
  const [phase, setPhase] = useState<"capturing" | "ingesting" | "error">("capturing");
  const [error, setError] = useState<string | null>(null);
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const manifest: TwinCaptureManifest = await LiDARCapture.presentCapture({
          confidence: "medium",
        });
        if (cancelled) return;

        if (manifest.cancelled) {
          onCancel();
          return;
        }

        setPhase("ingesting");
        // Let the WebView repaint once after the native modal dismisses before the
        // file ingest + navigation, so the content process is settled (avoids the
        // post-capture "Load failed" recovery page).
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (cancelled) return;

        const files: File[] = [];
        const lidarFiles: File[] = [];

        if (manifest.videoUri) {
          files.push(await uriToFile(manifest.videoUri, "twin_capture.mp4", "video/mp4"));
        }
        if (manifest.plyUri) {
          const ply = await uriToFile(manifest.plyUri, "lidar_capture.ply", "application/octet-stream");
          lidarFiles.push(ply);
        }
        if (manifest.posesUri) {
          const poses = await uriToFile(manifest.posesUri, "lidar_poses.json", "application/json");
          lidarFiles.push(poses);
        }
        if (cancelled) return;

        const videoFile = files[0];
        const durationSeconds = manifest.durationSec ?? 0;

        await onFinish({
          files: [...files, ...lidarFiles],
          clips: videoFile
            ? [
                {
                  id:
                    typeof crypto !== "undefined" && "randomUUID" in crypto
                      ? crypto.randomUUID()
                      : `native-${Date.now()}`,
                  index: 0,
                  mode: "video",
                  durationSeconds,
                  frameCount: manifest.keyframeCount ?? 0,
                  files: [videoFile],
                  thumbnailUrl: null,
                },
              ]
            : [],
          photoCount: 0,
          videoSeconds: durationSeconds,
          estimatedBytes: [...files, ...lidarFiles].reduce((sum, f) => sum + f.size, 0),
          lidarFiles,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Native capture failed");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onFinish, onCancel]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      {phase === "error" ? (
        <>
          <p className="text-sm text-zinc-300">{error ?? "Capture failed."}</p>
          <button
            type="button"
            onClick={onCancel}
            className={cn("text-sm font-semibold", twinAccent.link)}
          >
            Back
          </button>
        </>
      ) : (
        <>
          <IconLoader2 className={cn("h-8 w-8 animate-spin", twinAccent.spinner)} />
          <p className="text-sm font-medium text-zinc-300">
            {phase === "capturing" ? "Opening LiDAR capture…" : "Saving scan…"}
          </p>
        </>
      )}
    </div>
  );
}
