"use client";

import { useEffect, useState } from "react";
import type { VnextThermalSourceData } from "@/lib/vnext/explore-types";
import { registerLiveView } from "@/lib/vnext/views/live-view";
import { VnextViewerMediaError } from "./VnextViewerMediaError";

export default function VnextThermalViewer({
  data,
  captureId = null,
}: {
  data: VnextThermalSourceData;
  captureId?: string | null;
}) {
  const initial = Math.max(0, data.captures.findIndex((capture) => capture.id === captureId));
  const [index, setIndex] = useState(initial === -1 ? 0 : initial);
  const [errorCaptureId, setErrorCaptureId] = useState<string | null>(null);
  const captures = data.captures;
  const current = captures[Math.min(index, Math.max(0, captures.length - 1))];

  useEffect(() => {
    return registerLiveView(() => (current ? { kind: "thermal", captureId: current.id } : null));
  }, [current]);

  if (captures.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--graphite-canvas)] px-6 text-center">
        <p className="text-sm text-zinc-400">This thermal session has no viewable images yet.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--graphite-canvas)]" data-vnext-thermal-capture={current?.id ?? ""}>
      <div className="relative flex-1 overflow-hidden">
        {current && errorCaptureId === current.id ? (
          // Thermal capture URLs are presigned S3 links, not a re-signing proxy — a genuine retry
          // needs a fresh signed URL from the server, which a full reload gets honestly (not a
          // placebo re-render of the same broken link).
          <VnextViewerMediaError onRetry={() => window.location.reload()} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current?.imageUrl}
            alt={current?.label ?? data.sessionName}
            className="h-full w-full object-contain"
            onError={() => current && setErrorCaptureId(current.id)}
          />
        )}
      </div>

      {captures.length > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex h-11 min-w-[44px] items-center justify-center px-3 text-sm text-zinc-200 disabled:opacity-40"
          >
            ← Prev
          </button>
          <p className="text-xs text-zinc-400">
            {index + 1} of {captures.length}
          </p>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(captures.length - 1, i + 1))}
            disabled={index >= captures.length - 1}
            className="flex h-11 min-w-[44px] items-center justify-center px-3 text-sm text-zinc-200 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}

      {captures.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-2">
          {captures.map((capture, i) => (
            <button
              key={capture.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border ${
                i === index ? "border-[var(--graphite-primary)]" : "border-white/10"
              }`}
              title={capture.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capture.imageUrl} alt={capture.label} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
