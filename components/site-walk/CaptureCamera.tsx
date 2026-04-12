"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/lib/hooks/useCamera";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import type { SiteWalkItem } from "@/lib/types/site-walk";

type Props = {
  sessionId: string;
  onItemCaptured: (item: SiteWalkItem) => void;
};

export function CaptureCamera({ sessionId, onItemCaptured }: Props) {
  const { videoRef, isStreaming, error, startCamera, stopCamera, capturePhoto } =
    useCamera();
  const { position } = useGeolocation();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const [saving, setSaving] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    requestWakeLock();
    return () => {
      mountedRef.current = false;
      stopCamera();
      releaseWakeLock();
    };
  }, [startCamera, stopCamera, requestWakeLock, releaseWakeLock]);

  async function handleCapture() {
    const result = capturePhoto();
    if (!result) return;
    setLastCapture(result.url);
    setSaving(true);

    try {
      // 1. Get presigned upload URL
      const uploadRes = await fetch("/api/site-walk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `photo-${Date.now()}.jpg`,
          contentType: "image/jpeg",
          sessionId,
        }),
      });

      let s3Key: string | undefined;
      if (uploadRes.ok) {
        const { uploadUrl, s3Key: key } = await uploadRes.json();
        // 2. Upload blob directly to S3
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: result.blob,
        });
        if (putRes.ok) s3Key = key;
      }

      // 3. Create item with S3 reference
      const res = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "photo",
          title: `Photo ${new Date().toLocaleTimeString()}`,
          latitude: position?.latitude,
          longitude: position?.longitude,
          location_label: position
            ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
            : undefined,
          photo_s3_key: s3Key,
          metadata: {
            width: result.width,
            height: result.height,
            captured_at: new Date().toISOString(),
          },
        }),
      });
      if (res.ok && mountedRef.current) {
        const { item } = await res.json();
        onItemCaptured(item);
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
        setTimeout(() => setLastCapture(null), 1500);
      }
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Camera className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => startCamera()}>
          <RotateCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Viewfinder */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* GPS indicator */}
        {position && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            <MapPin className="h-3 w-3" /> GPS
          </div>
        )}
        {/* Flash preview */}
        {lastCapture && (
          <div className="absolute inset-0 animate-pulse bg-white/30" />
        )}
      </div>

      {/* Shutter button */}
      <div className="flex items-center justify-center bg-background py-4">
        <button
          onClick={handleCapture}
          disabled={!isStreaming || saving}
          className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-primary bg-white transition-transform active:scale-90 disabled:opacity-50"
          aria-label="Capture photo"
        >
          {saving ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </div>
  );
}
