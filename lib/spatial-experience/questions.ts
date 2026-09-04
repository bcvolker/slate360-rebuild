/** Guest Ask a Question — spatial conversation, not a Procore RFI. */

import type { SpatialLocator } from "./locators";

export const QUESTION_COPY = {
  action: "Ask a Question",
  submit: "Send question",
  guestHelp: "This starts a conversation on this view. It is not a formal RFI.",
} as const;

export type QuestionDraft = {
  text: string;
  locator: SpatialLocator;
  snapshotKey?: string | null;
};

export type QuestionActor = "guest" | "admin" | "client";

export function guestMayAsk(entitled: boolean): boolean {
  return entitled;
}

export function mayReply(actor: QuestionActor): boolean {
  return actor === "guest" || actor === "admin" || actor === "client";
}

export function mayResolve(actor: QuestionActor): boolean {
  return actor === "admin" || actor === "client";
}

export function mayManage(actor: QuestionActor): boolean {
  return actor === "admin";
}

export function questionTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}
