"use client";

import { useState } from "react";
import { Loader2, MonitorPlay } from "lucide-react";

/**
 * Pixel Streaming viewer for the live Unreal feed.
 *
 * Today: renders the managed host's embed URL in an iframe (Eagle3D / AWS
 * signaling page) — dependency-free and works for the validation phase.
 * Later: for self-hosted, swap the iframe for Epic's
 * `@epicgames-ps/lib-pixelstreamingfrontend-ui` mounted on a <div>, using the
 * same `streamUrl`/`signalingUrl` props. Commands are sent over the same
 * connection via the page's emitUIInteraction bridge.
 */
export function PixelStreamViewer({
  streamUrl,
  title = "Unreal session",
}: {
  streamUrl: string | null;
  title?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!streamUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
        <MonitorPlay className="size-7 text-slate-700" />
        <p className="text-slate-400">No live Unreal session</p>
        <p className="max-w-xs text-xs text-slate-600">
          Start a high-quality session once the Unreal host is connected. Quick previews use the
          model viewer; this fills with the live streamed engine.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-400">
          <Loader2 className="mr-2 size-4 animate-spin" /> Connecting to {title}…
        </div>
      )}
      <iframe
        src={streamUrl}
        title={title}
        onLoad={() => setLoaded(true)}
        allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
        className="h-full w-full border-0"
      />
    </div>
  );
}
