"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import type { SplatViewerHandle } from "@/components/digital-twin/splat-viewer-constants";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import { readLiveView } from "@/lib/vnext/views/live-view";
import { SAVED_VIEW_ASPECTS, type SavedViewAspect, type VnextSavedView } from "@/lib/vnext/views/saved-view-types";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

const PathAuthoring = dynamic(() => import("./VnextPathAuthoring").then((mod) => mod.VnextPathAuthoring), { ssr: false });

type Props = {
  projectId: string;
  basePath: string;
  views: VnextSavedView[];
  canWrite: boolean;
  failed: boolean;
  representation: VnextExploreRepresentation | null;
  sourceId: string | null;
  itemId: string | null;
  aspect: SavedViewAspect | null;
  onAspect: (aspect: SavedViewAspect | null) => void;
  onViews: (views: VnextSavedView[]) => void;
  persist: "local" | "api";
  pathModelId: string | null;
  initialPath: TwinCameraPath | null;
  getHandle: () => SplatViewerHandle | null;
};

const control = "h-11 min-w-[44px] border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

export function VnextSavedViewsPanel(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loadedPath, setLoadedPath] = useState<TwinCameraPath | null>(props.initialPath);

  useEffect(() => {
    if (props.initialPath) {
      setLoadedPath(props.initialPath);
      return;
    }
    if (props.persist !== "api" || props.representation !== "reality" || !props.sourceId) return;
    let cancelled = false;
    void fetch(`/api/vnext/projects/${props.projectId}/models/${props.sourceId}/camera-path`)
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as { cameraPath?: TwinCameraPath };
        if (body.cameraPath) setLoadedPath(body.cameraPath);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.initialPath, props.persist, props.projectId, props.representation, props.sourceId]);

  const pathModelId = props.pathModelId ?? (props.representation === "reality" ? props.sourceId : null);

  const openView = (view: VnextSavedView) => {
    router.push(vnextExploreHref(props.basePath, {
      rep: view.representation,
      source: view.sourceId,
      item: view.itemId,
      view: view.id,
      guide: view.aspect,
    }));
  };

  const save = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || !props.representation || !props.sourceId) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    const draft = {
      title: nextTitle,
      representation: props.representation,
      sourceId: props.sourceId,
      itemId: props.itemId,
      viewState: readLiveView(),
      aspect: props.aspect,
    };
    if (props.persist === "local") {
      const view: VnextSavedView = {
        id: `local-${Date.now()}`,
        projectId: props.projectId,
        title: nextTitle,
        representation: props.representation,
        sourceId: props.sourceId,
        visitId: null,
        occurredAt: null,
        itemId: props.itemId,
        planSheetId: props.representation === "plan" ? props.sourceId : null,
        viewState: null,
        aspect: props.aspect,
        createdAt: new Date().toISOString(),
      };
      const live = draft.viewState;
      if (live && typeof live === "object" && "kind" in (live as object)) view.viewState = live as VnextSavedView["viewState"];
      props.onViews([view, ...props.views]);
      setTitle("");
      return;
    }
    const response = await fetch(`/api/vnext/projects/${props.projectId}/saved-views`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { id?: string };
    if (!body.id) return;
    router.replace(vnextExploreHref(props.basePath, { rep: props.representation, source: props.sourceId, item: props.itemId, view: body.id, guide: props.aspect }));
    router.refresh();
  };

  const rename = async (view: VnextSavedView) => {
    const next = renameTitle.trim();
    if (!next) return;
    if (props.persist === "local") {
      props.onViews(props.views.map((entry) => (entry.id === view.id ? { ...entry, title: next } : entry)));
      setRenameId(null);
      return;
    }
    const response = await fetch(`/api/vnext/projects/${props.projectId}/saved-views/${view.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (response.ok) router.refresh();
  };

  const remove = async (view: VnextSavedView) => {
    if (props.persist === "local") {
      props.onViews(props.views.filter((entry) => entry.id !== view.id));
      setConfirmId(null);
      return;
    }
    const response = await fetch(`/api/vnext/projects/${props.projectId}/saved-views/${view.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  };

  return (
    <section className="mt-3" data-vnext-saved-views="true">
      <button type="button" className={control} aria-expanded={open} data-vnext-views-toggle="true" onClick={() => setOpen((value) => !value)}>
        Views
      </button>
      {open ? (
        <div className="mt-2 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-3">
          {props.failed ? <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">Saved views could not be loaded.</p> : null}
          {props.views.length === 0 ? <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-views-empty="true">No saved views</p> : (
            <ul className="m-0 list-none p-0">
              {props.views.map((view) => (
                <li key={view.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--vnext-line)] py-2" data-vnext-saved-view={view.id}>
                  <button type="button" className={`${control} max-w-full whitespace-normal border-0 px-0 text-left`} onClick={() => openView(view)}>
                    {view.title}
                    {formatPlainDate(view.occurredAt) ? ` · ${formatPlainDate(view.occurredAt)}` : ""}
                  </button>
                  {props.canWrite && renameId === view.id ? (
                    <>
                      <input className="h-11 min-w-[44px] border border-[var(--vnext-line)] bg-[var(--vnext-canvas)] px-2 text-[var(--vnext-ink)]" value={renameTitle} aria-label="Rename view" onChange={(event) => setRenameTitle(event.target.value)} />
                      <button type="button" className={control} onClick={() => void rename(view)} data-vnext-rename-save="true">Save title</button>
                    </>
                  ) : null}
                  {props.canWrite && renameId !== view.id ? (
                    <button type="button" className={control} data-vnext-rename-view={view.id} onClick={() => { setRenameId(view.id); setRenameTitle(view.title); }}>Rename</button>
                  ) : null}
                  {props.canWrite && confirmId === view.id ? (
                    <button type="button" className={control} data-vnext-delete-confirm={view.id} onClick={() => void remove(view)}>Confirm delete</button>
                  ) : null}
                  {props.canWrite ? (
                    <button type="button" className={control} data-vnext-delete-view={view.id} onClick={() => setConfirmId(view.id)}>Delete</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {props.canWrite && props.representation && props.sourceId ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input className="h-11 min-w-[8rem] flex-1 border border-[var(--vnext-line)] bg-[var(--vnext-canvas)] px-2 text-[var(--vnext-ink)]" aria-label="View title" placeholder="Level 2 corridor" value={title} data-vnext-view-title-input="true" onChange={(event) => setTitle(event.target.value)} />
              <button type="button" className={control} data-vnext-save-view="true" onClick={() => void save()}>Save view</button>
            </div>
          ) : null}
          {titleError ? <p className="mt-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]" data-vnext-title-error="true">Enter a title.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2" data-vnext-aspect-controls="true">
            {SAVED_VIEW_ASPECTS.map((aspect) => (
              <button key={aspect} type="button" className={control} aria-pressed={props.aspect === aspect} data-vnext-aspect={aspect} onClick={() => props.onAspect(props.aspect === aspect ? null : aspect)}>
                {aspect}
              </button>
            ))}
          </div>
          {pathModelId && loadedPath ? (
            <PathAuthoring modelId={pathModelId} initialPath={loadedPath} canWrite={props.canWrite} persist={props.persist} projectId={props.projectId} getHandle={props.getHandle} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
