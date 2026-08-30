"use client";

import type { ProjectItem, ProjectItemStatus } from "@/lib/spatial-walkthrough/project-items";
import { walkthroughHref } from "@/lib/spatial-walkthrough/project-items";

type Props = {
  items: ProjectItem[];
  canManage: boolean;
  shareBasePath?: string;
  status: ProjectItemStatus | "all";
  assignee: string;
  onStatus: (value: ProjectItemStatus | "all") => void;
  onAssignee: (value: string) => void;
  onSelect: (id: string) => void;
  title?: string;
  layout?: "drawer" | "page";
};

export function ProjectItemsList({
  items,
  canManage,
  shareBasePath = "/w/preview",
  status,
  assignee,
  onStatus,
  onAssignee,
  onSelect,
  title = "Project Items",
  layout = "drawer",
}: Props) {
  return (
    <section className="sw-item-panel" data-view="list" data-manage={canManage ? "true" : "false"} data-layout={layout}>
      <header>
        <div>
          <p className="sw-item-kicker">{canManage ? "Contractor" : "Visible to me"}</p>
          <h2>{title}</h2>
        </div>
      </header>
      <div className="sw-item-body">
        <div className="sw-item-filters">
          <select value={status} onChange={(e) => onStatus(e.target.value as ProjectItemStatus | "all")}>
            <option value="all">All status</option>
            <option value="open">open</option>
            <option value="in_progress">in progress</option>
            <option value="waiting">waiting</option>
            <option value="closed">closed</option>
          </select>
          {canManage ? (
            <input value={assignee} onChange={(e) => onAssignee(e.target.value)} placeholder="Filter assignee" />
          ) : null}
        </div>
        <div className="sw-item-list">
          {items.map((item) => {
            const locator = item.locators[0];
            const href = locator ? walkthroughHref({ basePath: shareBasePath, locator }) : shareBasePath;
            return (
              <button key={item.id} type="button" className="sw-item-card" onClick={() => onSelect(item.id)}>
                <strong>{item.title}</strong>
                <small>{item.type} · {item.status} · {item.visibility}</small>
                {locator ? <a href={href} onClick={(e) => e.stopPropagation()}>Open in Walkthrough</a> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
