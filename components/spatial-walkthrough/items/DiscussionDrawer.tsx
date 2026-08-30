"use client";

import type { ProjectItem, ProjectItemActivity, ProjectItemComment, ProjectItemStatus } from "@/lib/spatial-walkthrough/project-items";
import { isDiscussion, walkthroughHref } from "@/lib/spatial-walkthrough/project-items";

type Props = {
  item: ProjectItem;
  comments: ProjectItemComment[];
  activity: ProjectItemActivity[];
  canManage: boolean;
  shareBasePath?: string;
  onClose: () => void;
  onComment: (text: string) => void;
  onConvert?: () => void;
  onAssign?: (assigneeId: string) => void;
  onStatus?: (status: ProjectItemStatus) => void;
  draft?: string;
  onDraft?: (value: string) => void;
};

export function DiscussionDrawer({
  item,
  comments,
  activity,
  canManage,
  shareBasePath = "/w/preview",
  onClose,
  onComment,
  onConvert,
  onAssign,
  onStatus,
  draft = "",
  onDraft,
}: Props) {
  const locator = item.locators[0];
  const openHref = locator ? walkthroughHref({ basePath: shareBasePath, locator }) : shareBasePath;

  return (
    <section className="sw-item-panel" data-view="discussion">
      <header>
        <div>
          <p className="sw-item-kicker">{isDiscussion(item.type) ? "Discussion" : "Action item"}</p>
          <h2>{item.title}</h2>
        </div>
        <button type="button" className="sw-chrome-btn" onClick={onClose}>Close</button>
      </header>
      <div className="sw-item-body">
        {item.description ? <p>{item.description}</p> : null}
        <p className="sw-item-meta">{item.status} · {item.priority} · {item.visibility}</p>
        <a className="sw-chrome-btn" href={openHref}>Open in Walkthrough</a>
        {comments.map((c) => (
          <article key={c.id} className="sw-item-card">
            <p>{c.text || "Voice comment"}</p>
            {c.voiceAssetId ? <small>Voice comment attached</small> : null}
            <small>{c.createdAt}</small>
          </article>
        ))}
        <ul className="sw-item-activity">
          {activity.map((a) => (
            <li key={a.id}>{a.kind.replace("_", " ")}</li>
          ))}
        </ul>
        <textarea value={draft} onChange={(e) => onDraft?.(e.target.value)} placeholder="Reply" />
        <div className="sw-item-row">
          <button type="button" className="sw-chrome-btn" onClick={() => draft.trim() && onComment(draft.trim())}>Reply</button>
          {canManage && isDiscussion(item.type) ? (
            <button type="button" className="sw-chrome-btn" data-accent="true" onClick={onConvert}>Convert to action</button>
          ) : null}
        </div>
        {canManage ? (
          <div className="sw-item-row">
            <input placeholder="Assignee user id" onBlur={(e) => e.target.value && onAssign?.(e.target.value)} />
            <select value={item.status} onChange={(e) => onStatus?.(e.target.value as ProjectItemStatus)}>
              <option value="open">open</option>
              <option value="in_progress">in progress</option>
              <option value="waiting">waiting</option>
              <option value="closed">closed</option>
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}
