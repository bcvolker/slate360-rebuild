"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectItem, ProjectItemActivity, ProjectItemComment, ProjectItemStatus } from "@/lib/spatial-walkthrough/project-items";
import { filterItemList } from "@/lib/spatial-walkthrough/project-items";
import { DiscussionDrawer } from "@/components/spatial-walkthrough/items/DiscussionDrawer";
import { ProjectItemsList } from "@/components/spatial-walkthrough/items/ProjectItemsList";
import "@/components/spatial-walkthrough/items/item-panel.css";

export function ProjectItemsPage({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<ProjectItemComment[]>([]);
  const [activity, setActivity] = useState<ProjectItemActivity[]>([]);
  const [status, setStatus] = useState<ProjectItemStatus | "all">("all");
  const [assignee, setAssignee] = useState("");
  const [draft, setDraft] = useState("");
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const list = useMemo(() => filterItemList(items, { status, assigneeId: assignee || null }), [items, status, assignee]);

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough/project-items?projectId=${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.items)) setItems(json.items); })
      .catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    if (!selectedId) return;
    void fetch(`/api/spatial-walkthrough/project-items/${selectedId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        setComments(json.comments ?? []);
        setActivity(json.activity ?? []);
      })
      .catch(() => undefined);
  }, [selectedId]);

  return (
    <div className="sw-item-page">
      <h1>Project Items</h1>
      <div className="relative min-h-[32rem]">
        <ProjectItemsList
          items={list}
          canManage
          layout="page"
          shareBasePath={`/projects/${projectId}/walkthroughs`}
          status={status}
          assignee={assignee}
          onStatus={setStatus}
          onAssignee={setAssignee}
          onSelect={setSelectedId}
        />
        {selected ? (
          <DiscussionDrawer
            item={selected}
            comments={comments}
            activity={activity}
            canManage
            shareBasePath={selected.locators[0]?.walkthroughId ? `/projects/${projectId}/walkthroughs/${selected.locators[0].walkthroughId}` : `/projects/${projectId}/walkthroughs`}
            draft={draft}
            onDraft={setDraft}
            onClose={() => setSelectedId(null)}
            onComment={(text) => {
              void fetch(`/api/spatial-walkthrough/project-items/${selected.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              });
              setDraft("");
            }}
            onConvert={() => {
              void fetch(`/api/spatial-walkthrough/project-items/${selected.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "issue" }) });
            }}
            onAssign={(assigneeId) => {
              void fetch(`/api/spatial-walkthrough/project-items/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assigneeId }),
              });
            }}
            onStatus={(next) => {
              void fetch(`/api/spatial-walkthrough/project-items/${selected.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: next }),
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
