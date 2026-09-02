"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import { mapSharePins, normalizeSharePayload, shareClipList, type WalkBoot } from "@/lib/spatial-walkthrough/share-payload";
import { configForProfile } from "@/lib/spatial-walkthrough/experience-profile";
import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
import { PosterStage } from "@/components/spatial-walkthrough/viewer/PosterStage";
import { ShareErrorBoundary } from "./ShareErrorBoundary";
import { SharePasswordGate } from "./SharePasswordGate";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

export function WalkthroughShareClient({ token, boot }: { token: string; boot?: WalkBoot | null }) {
  const search = useSearchParams();
  const locator = useMemo(() => parseShareLocator(search ?? ""), [search]);
  const [needsPassword, setNeedsPassword] = useState(boot?.accessState === "password");
  const [error, setError] = useState<string | null>(boot?.accessState === "denied" ? "This walkthrough is unavailable." : null);
  const [payload, setPayload] = useState<ReturnType<typeof normalizeSharePayload> | null>(null);
  const [posterReady, setPosterReady] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/spatial-walkthrough/public/${token}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && json.needsPassword) {
      setNeedsPassword(true);
      setPayload(null);
      return;
    }
    if (!res.ok) {
      setError("This walkthrough is unavailable.");
      return;
    }
    setNeedsPassword(false);
    setPayload(normalizeSharePayload(json));
  }, [token]);

  useEffect(() => {
    if (boot?.accessState === "password") return;
    void load();
  }, [boot?.accessState, load]);

  const unlock = async (code: string) => {
    setError(null);
    const res = await fetch(`/api/spatial-walkthrough/public/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      setError("That access code is not valid.");
      return;
    }
    await load();
  };

  if (needsPassword && !payload) {
    return <SharePasswordGate error={error} onSubmit={(value) => void unlock(value)} />;
  }
  if (error && !payload && !boot?.posterUrl) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center bg-[var(--graphite-canvas)] text-sm text-[var(--graphite-text-header)]">
        {error}
      </div>
    );
  }

  if (!payload?.clip) {
    const title = boot?.title || "Spatial Walkthrough";
    const posterUrl = boot?.posterUrl ?? null;
    return (
      <div
        className="relative min-h-[100dvh] bg-[var(--graphite-canvas)]"
        data-scene-visible={posterReady && Boolean(posterUrl) ? "true" : "false"}
        data-visible-layer="hero"
      >
        <PosterStage posterUrl={posterUrl} title={title} onPosterLoad={() => setPosterReady(true)} />
      </div>
    );
  }

  const clips = shareClipList(payload);
  const profile = configForProfile(payload.profile);

  return (
    <ShareErrorBoundary>
      <div data-experience-profile={profile.profile} data-scene-visible="true" data-visible-layer="hero">
        <ChapterWalkthroughExperience
          theme={payload.theme}
          title={payload.walkthrough.title}
          videoUrl={payload.clip.proxyUrl}
          posterUrl={payload.clip.posterUrl}
          clipId={payload.clip.id}
          waypoints={payload.waypoints}
          pins={mapSharePins(payload.pins, payload.attachments, token, payload.allowDownload)}
          redactions={payload.redactions}
          operatorPatch={payload.operatorPatch}
          allowDownload={payload.allowDownload}
          capturedAt={payload.walkthrough.capturedAt}
          projectName={payload.walkthrough.building}
          duration={Number(payload.clip.durationS ?? 0)}
          initialMode="explore"
          walkthroughId={payload.walkthrough.id ?? ""}
          clips={clips}
          chapters={payload.chapters}
          edges={payload.edges}
          locator={locator}
          lockedChapterId={payload.lockedChapterId}
          shareBasePath={`/w/${token}`}
          selectedId={locator.pinId}
        />
      </div>
    </ShareErrorBoundary>
  );
}
