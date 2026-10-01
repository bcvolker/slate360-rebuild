/** Persist question events. Email send is optional later. No Slack/Teams. */

export const QUESTION_EVENT_KINDS = ["question_created", "question_replied", "question_resolved"] as const;
export type QuestionEventKind = (typeof QUESTION_EVENT_KINDS)[number];

export type NotificationEvent = {
  kind: QuestionEventKind;
  projectId: string;
  itemId: string;
  deepLink: string;
  payload: Record<string, unknown>;
};

export function questionDeepLink(args: {
  token: string;
  itemId: string;
  locator?: { t?: number; yaw?: number; pitch?: number; stationId?: string };
}): string {
  const qs = new URLSearchParams();
  if (args.locator?.t != null) qs.set("t", String(args.locator.t));
  if (args.locator?.yaw != null) qs.set("yaw", String(args.locator.yaw));
  if (args.locator?.pitch != null) qs.set("pitch", String(args.locator.pitch));
  if (args.locator?.stationId) qs.set("station", args.locator.stationId);
  const q = qs.toString();
  return `/portal/${args.token}/item/${args.itemId}${q ? `?${q}` : ""}`;
}

export function planQuestionNotice(event: NotificationEvent): { inApp: true; email: "queued" | "skipped" } {
  return { inApp: true, email: "skipped" };
}
