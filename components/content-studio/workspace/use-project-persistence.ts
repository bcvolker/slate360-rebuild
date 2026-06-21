"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore, type TimelineClip } from "./editor-store";

export type SaveStatus = "loading" | "saving" | "saved" | "idle";

type ProjectInfo = { id: string; title: string };

/**
 * Project persistence: on mount, load the org's edit project and hydrate the
 * timeline (re-resolving each clip's proxy URL, since signed URLs expire);
 * thereafter, debounce-autosave the timeline on every change.
 *
 * We persist the EDITOR model (clips + mode), not the render spec — the spec is
 * rebuilt from clips at export. Signed `src` URLs are NOT trusted on reload; they
 * are re-fetched from the media API by assetId.
 */
export function useProjectPersistence() {
  const clips = useEditorStore((s) => s.clips);
  const overlayItems = useEditorStore((s) => s.overlayItems);
  const mode = useEditorStore((s) => s.mode);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const hydrated = useRef(false);

  // ── Load + hydrate ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projRes, mediaRes] = await Promise.all([
          fetch("/api/content-studio/projects"),
          fetch("/api/content-studio/media"),
        ]);
        if (!projRes.ok) { setStatus("idle"); hydrated.current = true; return; }
        const projJson = await projRes.json();
        const p = projJson.project ?? projJson.data?.project;
        const mediaJson = mediaRes.ok ? await mediaRes.json() : {};
        const assets: { id: string; proxyUrl: string | null }[] = mediaJson.assets ?? mediaJson.data?.assets ?? [];
        const srcOf = new Map(assets.map((a) => [a.id, a.proxyUrl]));
        if (cancelled) return;

        if (p) {
          setProject({ id: p.id, title: p.title ?? "Untitled edit" });
          const saved: TimelineClip[] = Array.isArray(p.timelineJson?.clips) ? p.timelineJson.clips : [];
          // Re-resolve fresh proxy URLs; drop clips whose source is gone.
          const rehydrated = saved
            .map((c) => ({ ...c, src: srcOf.get(c.assetId) ?? c.src }))
            .filter((c) => !!c.src);
          const overlays = Array.isArray(p.timelineJson?.overlayItems) ? p.timelineJson.overlayItems : [];
          if (rehydrated.length || overlays.length) {
            if (rehydrated.length) useEditorStore.getState().loadClips(rehydrated);
            if (overlays.length) useEditorStore.getState().setOverlayItems(overlays);
            useEditorStore.temporal.getState().clear(); // loaded state is the baseline, not "undoable to empty"
          }
          if (p.timelineJson?.mode) useEditorStore.getState().setMode(p.timelineJson.mode);
          useEditorStore.getState().setEditProjectId(p.id);
        }
        setStatus("saved");
      } catch {
        setStatus("idle");
      } finally {
        hydrated.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Debounced autosave ──
  useEffect(() => {
    if (!hydrated.current || !project) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        const s = useEditorStore.getState();
        const res = await fetch("/api/content-studio/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: project.id,
            mode: s.mode,
            timelineJson: { editorVersion: 1, mode: s.mode, clips: s.clips, overlayItems: s.overlayItems },
          }),
        });
        setStatus(res.ok ? "saved" : "idle");
      } catch {
        setStatus("idle");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [clips, overlayItems, mode, project]);

  return { project, status };
}
