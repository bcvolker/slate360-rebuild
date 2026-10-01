/** Typed events for later summary / RFI / action-item extraction. No AI runs here. */

export const WALKTHROUGH_EVENT_KINDS = [
  "narration.recorded",
  "narration.uploaded",
  "narration.replaced",
  "narration.deleted",
  "voice_note.played",
  "transcript.ready",
  "transcript.manual",
  "briefing.started",
  "briefing.interrupt",
  "briefing.resume",
  "document.opened",
] as const;

export type WalkthroughEventKind = (typeof WALKTHROUGH_EVENT_KINDS)[number];

export type WalkthroughEvent = {
  kind: WalkthroughEventKind;
  tSeconds: number | null;
  walkthroughId: string;
  payload: Record<string, unknown>;
};

export function makeWalkthroughEvent(
  kind: WalkthroughEventKind,
  walkthroughId: string,
  tSeconds: number | null,
  payload: Record<string, unknown> = {},
): WalkthroughEvent {
  return { kind, walkthroughId, tSeconds, payload };
}

export const FUTURE_AI_JOBS = [
  "automatic_summary",
  "rfi_extraction",
  "action_item_extraction",
  "chapter_suggestions",
  "weekly_progress_summary",
] as const;

export type FutureAiJob = (typeof FUTURE_AI_JOBS)[number];

export function eventSupportsJob(kind: WalkthroughEventKind, job: FutureAiJob): boolean {
  if (job === "automatic_summary" || job === "weekly_progress_summary") {
    return kind === "transcript.ready" || kind === "transcript.manual";
  }
  if (job === "rfi_extraction" || job === "action_item_extraction") {
    return kind === "transcript.ready" || kind === "voice_note.played";
  }
  if (job === "chapter_suggestions") {
    return kind === "transcript.ready" || kind === "narration.uploaded" || kind === "narration.recorded";
  }
  return false;
}
