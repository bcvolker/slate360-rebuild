/**
 * Twin 360 mobile list state — pure helpers shared by Home (S1) and Project
 * twins (S2). Five honest states, five words max, per the redesign §4:
 * Uploading · Saved · Processing · Ready · Failed.
 */

import type { HubTwin } from "@/lib/types/digital-twin-hub";

export type TwinHubState = "uploading" | "saved" | "processing" | "ready" | "failed";

export const TWIN_HUB_STATE_LABEL: Record<TwinHubState, string> = {
  uploading: "Uploading",
  saved: "Saved",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export function resolveTwinHubState(input: {
  spaceStatus: string;
  latestJobStatus: string | null;
  hasCapture: boolean;
  uploading: boolean;
  readyModels: number;
}): TwinHubState {
  if (input.readyModels > 0 || input.spaceStatus === "ready") return "ready";
  if (input.latestJobStatus === "failed") return "failed";
  if (input.latestJobStatus === "queued" || input.latestJobStatus === "processing") return "processing";
  if (input.spaceStatus === "processing") return "processing";
  if (input.uploading) return "uploading";
  if (input.spaceStatus === "failed") return "failed";
  return input.hasCapture ? "saved" : "saved";
}

export type TwinListFilter = "all" | "saved" | "ready";

export function matchesTwinListFilter(state: TwinHubState, filter: TwinListFilter): boolean {
  if (filter === "all") return true;
  if (filter === "ready") return state === "ready";
  return state === "saved" || state === "uploading";
}

/** "Today · 7:24 PM", "Yesterday · 9:10 AM", "Sep 6 · 3:42 PM". */
export function formatTwinWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${dayLabel(d, now)} · ${time}`;
}

export function dayLabel(d: Date, now: Date = new Date()): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((start(now) - start(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** Older producers of HubTwin (spaces POST, dev sandboxes) may omit the new fields. */
export function hubStateOf(twin: HubTwin): TwinHubState {
  return twin.hubState ?? (twin.readyModels > 0 ? "ready" : "saved");
}

export type TwinDayGroup = { label: string; twins: HubTwin[] };

/** Newest first, grouped by calendar day of last activity. */
export function groupTwinsByDay(twins: readonly HubTwin[], now: Date = new Date()): TwinDayGroup[] {
  const sorted = [...twins].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const groups: TwinDayGroup[] = [];
  for (const twin of sorted) {
    const label = dayLabel(new Date(twin.updatedAt), now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.twins.push(twin);
    else groups.push({ label, twins: [twin] });
  }
  return groups;
}

export const UNFILED_PROJECT_KEY = "unfiled";

export type TwinProjectCard = {
  /** Project id, or UNFILED_PROJECT_KEY for twins without a project. */
  key: string;
  projectId: string | null;
  name: string;
  count: number;
  readyCount: number;
  /** Latest activity across the project's twins, ISO. */
  latestAt: string;
  /** Twin whose poster represents the project: newest ready twin with a poster, else newest with a poster. */
  posterTwinId: string | null;
  /** True when any twin is uploading or processing. */
  busy: boolean;
};

/** One card per project, newest activity first. Quick Scans (no project) is one card like any other. */
export function buildTwinProjectCards(twins: readonly HubTwin[]): TwinProjectCard[] {
  const cards = new Map<string, TwinProjectCard & { readyPoster: HubTwin | null; anyPoster: HubTwin | null }>();
  for (const twin of twins) {
    const key = twin.projectId ?? UNFILED_PROJECT_KEY;
    const name = twin.projectId ? twin.projectName ?? "Project" : "Quick Scans · unfiled";
    const card =
      cards.get(key) ??
      {
        key,
        projectId: twin.projectId,
        name,
        count: 0,
        readyCount: 0,
        latestAt: twin.updatedAt,
        posterTwinId: null,
        busy: false,
        readyPoster: null,
        anyPoster: null,
      };
    const state = hubStateOf(twin);
    card.count += 1;
    if (state === "ready") card.readyCount += 1;
    if (state === "uploading" || state === "processing") card.busy = true;
    if (new Date(twin.updatedAt).getTime() > new Date(card.latestAt).getTime()) card.latestAt = twin.updatedAt;
    if (twin.hasPoster) {
      if (state === "ready" && (!card.readyPoster || twin.updatedAt > card.readyPoster.updatedAt)) card.readyPoster = twin;
      if (!card.anyPoster || twin.updatedAt > card.anyPoster.updatedAt) card.anyPoster = twin;
    }
    cards.set(key, card);
  }
  return [...cards.values()]
    .map(({ readyPoster, anyPoster, ...card }) => ({
      ...card,
      posterTwinId: (readyPoster ?? anyPoster)?.id ?? null,
    }))
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

/** The one unfinished thing to continue: newest uploading, then processing, then saved. */
export function pickContinueTwin(twins: readonly HubTwin[]): HubTwin | null {
  const rank: Record<TwinHubState, number> = { uploading: 0, processing: 1, saved: 2, failed: 3, ready: 9 };
  const candidates = twins.filter((t) => hubStateOf(t) !== "ready");
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      rank[hubStateOf(a)] - rank[hubStateOf(b)] || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return candidates[0];
}

/** Default scan name: "<Project> · Sep 8, 7:24 PM". */
export function defaultScanTitle(projectName: string | null, date: Date = new Date()): string {
  const when = `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  return `${projectName?.trim() || "Quick Scan"} · ${when}`;
}
