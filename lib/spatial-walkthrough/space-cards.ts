import type { ChapterRecord } from "./chapters";
import type { LibraryCard } from "./library-filter";

export type SpaceCard = LibraryCard & {
  kind: "space";
  walkthroughId: string;
  chapterId: string;
};

function captureType(chapterType: string): string {
  if (chapterType === "exterior" || chapterType === "aerial") return chapterType;
  return "interior";
}

export function spaceLibraryCards(
  walkthroughs: Array<{
    id: string;
    captured_at: string | null;
    building: string | null;
    floor: string | null;
    zone: string | null;
    walkthrough_type: string | null;
    status: string;
    shareStatus?: string;
  }>,
  chapters: ChapterRecord[],
): SpaceCard[] {
  const parent = new Map(walkthroughs.map((w) => [w.id, w]));
  return chapters.map((c) => {
    const wt = parent.get(c.walkthroughId);
    return {
      id: c.id,
      kind: "space" as const,
      walkthroughId: c.walkthroughId,
      chapterId: c.id,
      title: c.name,
      captured_at: wt?.captured_at ?? null,
      building: c.building ?? wt?.building ?? null,
      floor: c.floor ?? wt?.floor ?? null,
      zone: c.zone ?? wt?.zone ?? null,
      walkthrough_type: captureType(c.chapterType),
      status: wt?.status ?? "ready",
      duration_s: Math.max(0, c.endTime - c.startTime),
      waypointCount: 0,
      pinCount: 0,
      shareStatus: wt?.shareStatus,
    };
  });
}

export function spaceHref(item: LibraryCard, walkthroughHref: (id: string) => string): string {
  const space = item as Partial<SpaceCard>;
  if (space.walkthroughId && space.chapterId) {
    return `${walkthroughHref(space.walkthroughId)}?chapter=${space.chapterId}`;
  }
  return walkthroughHref(item.id);
}
