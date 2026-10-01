/** Domain events for project items. Email/push sending is stubbed. */

import type { ProjectItemActivityKind } from "./project-items";

export const ITEM_EVENT_KINDS = [
  "created",
  "commented",
  "assigned",
  "status_changed",
  "file_added",
  "closed",
] as const;

export type ItemEventKind = (typeof ITEM_EVENT_KINDS)[number];

export type ItemDomainEvent = {
  kind: ItemEventKind;
  itemId: string;
  projectId: string;
  walkthroughId: string | null;
  actorId: string | null;
  payload: Record<string, unknown>;
};

export type NotificationChannel = "in_app" | "email" | "push";
export type NotificationPlan = {
  channel: NotificationChannel;
  status: "queued" | "stubbed";
  reason?: string;
};

export function makeItemEvent(
  kind: ItemEventKind,
  itemId: string,
  projectId: string,
  actorId: string | null,
  payload: Record<string, unknown> = {},
  walkthroughId: string | null = null,
): ItemDomainEvent {
  return { kind, itemId, projectId, walkthroughId, actorId, payload };
}

export function activityKindFromEvent(kind: ItemEventKind): ProjectItemActivityKind {
  return kind;
}

export function planNotifications(event: ItemDomainEvent): NotificationPlan[] {
  const inApp = event.kind === "assigned" || event.kind === "commented" || event.kind === "status_changed" || event.kind === "closed";
  return [
    { channel: "in_app", status: inApp ? "queued" : "stubbed", reason: inApp ? undefined : "no in-app copy for this kind" },
    { channel: "email", status: "stubbed", reason: "email delivery not wired in this branch" },
    { channel: "push", status: "stubbed", reason: "push delivery not wired in this branch" },
  ];
}

export function inAppNotificationCopy(event: ItemDomainEvent): { title: string; message: string; linkPath: string } | null {
  const linkPath = `/projects/${event.projectId}/items`;
  if (event.kind === "assigned") {
    return { title: "Assigned to you", message: "A project item was assigned to you.", linkPath };
  }
  if (event.kind === "commented") {
    return { title: "New comment", message: "Someone commented on a project item.", linkPath };
  }
  if (event.kind === "status_changed" || event.kind === "closed") {
    return { title: "Item updated", message: "A project item status changed.", linkPath };
  }
  return null;
}
