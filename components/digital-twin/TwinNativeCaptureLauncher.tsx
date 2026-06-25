"use client";

import { useEffect, useRef, useState } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { LiDARCapture, type TwinCaptureManifest } from "@/src/plugins/LiDARCapture";

type Props = {
  spaceId: string;
  projectId: string;
  title?: string;
  onUploaded: (info: { captureId: string }) => void;
  onCancel: () => void;
};

/**
 * Native-led Twin capture launcher (iOS LiDAR devices only). Presents the native ARKit
 * capture screen; the native plugin then uploads the capture files directly to storage
 * and resolves with a `captureId`.
 *
 * The capture files (video + PLY + poses) intentionally NEVER cross into the JS heap.
 * The previous V1 path read them via `fetch(convertFileSrc(uri)).blob()`, which pulled
 * the whole MP4 into WebView memory on the remote origin and crashed the WebContent
 * process — surfacing as the post-capture "Load failed" page. Native upload removes the
 * crossing entirely; here we only ever receive a lightweight `captureId`.
 */
export function TwinNativeCaptureLauncher({ spaceId, projectId, title, onUploaded, onCancel }: Props) {
  const [phase, setPhase] = useState<"capturing" | "uploading" | "error">("capturing");
  const [error, setError] = useState<string | null>(null);
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    let cancelled = false;
    let listener: PluginListenerHandle | undefined;

    (async () => {
      // Flip the spinner copy when native leaves capture and starts uploading
      // (presentCapture stays pending until the upload finishes).
      listener = await LiDARCapture.addListener("uploadPhase", () => {
        if (!cancelled) setPhase("uploading");
      });

      try {
        const manifest: TwinCaptureManifest = await LiDARCapture.presentCapture({
          confidence: "medium",
          spaceId,
          projectId,
          title,
          apiBase: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (cancelled) return;

        if (manifest.cancelled) {
          onCancel();
          return;
        }
        if (manifest.uploadError) {
          setError(manifest.uploadError);
          setPhase("error");
          return;
        }
        if (manifest.captureId) {
          setPhase("uploading");
          await onUploaded({ captureId: manifest.captureId });
          return;
        }
        setError("Capture finished but produced no upload.");
        setPhase("error");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Native capture failed");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [spaceId, projectId, title, onUploaded, onCancel]);

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
            {phase === "capturing" ? "Opening LiDAR capture…" : "Uploading scan…"}
          </p>
        </>
      )}
    </div>
  );
}
