"use client";

import { useEffect, useMemo, useState } from "react";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import type { ItemAudience, ProjectItem, ProjectItemActivity, ProjectItemComment, ProjectItemStatus } from "@/lib/spatial-walkthrough/project-items";
import { filterItemList } from "@/lib/spatial-walkthrough/project-items";
import { FIXTURE_ACTIVITY, FIXTURE_COMMENTS, FIXTURE_ITEMS } from "@/lib/spatial-walkthrough/project-item-fixtures";
import { AskAboutThis, locatorFromPlayer } from "./AskAboutThis";
import { DiscussionDrawer } from "./DiscussionDrawer";
import { ProjectItemsList } from "./ProjectItemsList";
import "./item-panel.css";

type Props = {
  walkthroughId?: string;
  clipId: string;
  chapterId?: string | null;
  player: WalkthroughPlayerHandle | null;
  currentT: number;
  shareToken?: string | null;
  projectId?: string | null;
  canManage?: boolean;
  audience?: ItemAudience;
  preview?: boolean;
  previewView?: string | null;
};

export function CollaborationLayer({
  walkthroughId,
  clipId,
  chapterId,
  player,
  currentT,
  shareToken,
  projectId,
  canManage = false,
  audience = "client",
  preview = false,
  previewView = null,
}: Props) {
  const [open, setOpen] = useState<"ask" | "discussion" | "list" | null>(() => {
    if (previewView === "list" || previewView === "restricted" || previewView === "mine") return "list";
    if (previewView === "ask") return "ask";
    if (previewView) return "discussion";
    return null;
  });
  const [items, setItems] = useState<ProjectItem[]>(() =>
    preview && audience !== "contractor" ? FIXTURE_ITEMS.filter((i) => i.visibility !== "internal") : FIXTURE_ITEMS,
  );
  const [comments, setComments] = useState<ProjectItemComment[]>(FIXTURE_COMMENTS);
  const [activity, setActivity] = useState<ProjectItemActivity[]>(FIXTURE_ACTIVITY);
  const [selectedId, setSelectedId] = useState<string | null>(previewView ? "item-q1" : null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ProjectItemStatus | "all">("all");
  const [assignee, setAssignee] = useState("");
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const shareBase = shareToken ? `/w/${shareToken}` : "/w/preview";
  const locator = locatorFromPlayer(player, { t: currentT, yaw: 18, pitch: -6 }, { walkthroughId, clipId, chapterId });

  useEffect(() => {
    if (preview) return;
    const url = shareToken
      ? `/api/spatial-walkthrough/public/${shareToken}/items`
      : projectId
        ? `/api/spatial-walkthrough/project-items?projectId=${projectId}`
        : null;
    if (!url) return;
    void fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.items)) setItems(json.items);
      })
      .catch(() => undefined);
  }, [preview, shareToken, projectId]);

  const list = useMemo(
    () => filterItemList(previewView === "restricted" ? items.filter((i) => i.visibility !== "internal") : items, {
      status,
      assigneeId: assignee || null,
      mine: previewView === "mine" || (!canManage && audience === "client"),
      viewerId: canManage ? null : "client-1",
    }),
    [items, status, assignee, previewView, canManage, audience],
  );

  const submitAsk = async (input: { title: string; voice: Blob | null; fileUrl: string; fileType: string }) => {
    if (preview || !shareToken) {
      setItems((prev) => [{
        ...FIXTURE_ITEMS[0],
        id: "item-new",
        title: input.title,
        locators: [locator],
      }, ...prev]);
      setSelectedId("item-new");
      setOpen(previewView === "voice-comment" ? "discussion" : "discussion");
      return;
    }
    const form = new FormData();
    form.set("title", input.title);
    form.set("clipId", locator.clipId ?? clipId);
    if (locator.chapterId) form.set("chapterId", locator.chapterId);
    form.set("tSeconds", String(locator.tSeconds ?? 0));
    form.set("yawDeg", String(locator.yawDeg ?? 0));
    form.set("pitchDeg", String(locator.pitchDeg ?? 0));
    if (input.voice) form.set("voice", input.voice, "question.webm");
    if (input.fileUrl) {
      form.set("fileUrl", input.fileUrl);
      form.set("fileType", input.fileType);
    }
    await fetch(`/api/spatial-walkthrough/public/${shareToken}/ask`, { method: "POST", body: form });
    setOpen("discussion");
  };

  const showAsk = open === "ask" || previewView === "ask";
  const showDiscussion = Boolean(
    selected && (
      open === "discussion" ||
      previewView === "discussion" ||
      previewView === "convert" ||
      previewView === "assign" ||
      previewView === "voice-comment" ||
      previewView === "open"
    ),
  );
  const showList = (open === "list" || previewView === "list" || previewView === "restricted" || previewView === "mine") && !showDiscussion && !showAsk;

  return (
    <>
      <div className="sw-item-ask sw-item-row">
        <button type="button" className="sw-chrome-btn" data-accent="true" onClick={() => { setOpen("ask"); }}>
          Ask about this
        </button>
        <button type="button" className="sw-chrome-btn" onClick={() => setOpen("list")}>
          {canManage ? "Project Items" : "My questions"}
        </button>
      </div>
      {showAsk ? (
        <AskAboutThis locator={locator} onClose={() => setOpen(null)} onSubmit={submitAsk} />
      ) : null}
      {showDiscussion && selected ? (
        <DiscussionDrawer
          item={previewView === "convert" || previewView === "assign" ? { ...selected, type: previewView === "convert" ? "question" : "issue", assigneeId: previewView === "assign" ? "user-foreman" : selected.assigneeId } : selected}
          comments={previewView === "voice-comment" ? comments : comments.filter((c) => c.itemId === selected.id || preview)}
          activity={activity.filter((a) => a.itemId === selected.id || preview)}
          canManage={canManage || previewView === "convert" || previewView === "assign"}
          shareBasePath={shareBase}
          draft={draft}
          onDraft={setDraft}
          onClose={() => setOpen(null)}
          onComment={(text) => {
            setComments((prev) => [...prev, { id: `c-${prev.length}`, itemId: selected.id, authorId: "me", text, voiceAssetId: null, fileDocumentId: null, createdAt: new Date().toISOString() }]);
            setDraft("");
          }}
          onConvert={() => setItems((prev) => prev.map((i) => i.id === selected.id ? { ...i, type: "issue" } : i))}
          onAssign={(id) => setItems((prev) => prev.map((i) => i.id === selected.id ? { ...i, assigneeId: id } : i))}
          onStatus={(next) => setItems((prev) => prev.map((i) => i.id === selected.id ? { ...i, status: next, closedAt: next === "closed" ? new Date().toISOString() : null } : i))}
        />
      ) : null}
      {showList && !showDiscussion && !showAsk ? (
        <ProjectItemsList
          items={list}
          canManage={canManage || previewView === "list"}
          shareBasePath={shareBase}
          status={status}
          assignee={assignee}
          onStatus={setStatus}
          onAssignee={setAssignee}
          onSelect={(id) => { setSelectedId(id); setOpen("discussion"); }}
          title={previewView === "restricted" || audience === "client" ? "Open items visible to me" : "Project Items"}
        />
      ) : null}
    </>
  );
}
