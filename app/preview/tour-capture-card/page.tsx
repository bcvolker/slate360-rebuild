import { CaptureCard } from "@/components/spatial-tour/operator/CaptureCard";
import type { TourBundle } from "@/lib/spatial-tour/types";
import { DEFAULT_LOOK_CONE } from "@/lib/spatial-tour/look-cone";

export const dynamic = "force-dynamic";

const WALK = "7e0575a3-5d55-45d8-807f-9fb959ce2c21";
const CLIP = "f278d37f-1c2f-4511-aef5-437b3992d39d";
const cp = (id: string, chapterId: string, label: string, captureNote: string | null, sortOrder: number) => ({
  id, chapterId, label, captureNote, sortOrder, introducedInRevision: 1, retiredAt: null, replacedBy: null,
});
const mark = (checkpointId: string, t: number) => ({
  id: `m-${checkpointId}`, checkpointId, walkthroughId: WALK, clipId: CLIP, tSeconds: t, yawDeg: 0, pitchDeg: 0,
  match: "matched" as const, stillKey: "k", stillStatus: "ready" as const, stillError: null, stillBlackFraction: 0,
});

/** Unauthenticated harness for the printable capture card. Reference stills use the clip poster via `?token=`. */
export default async function TourCaptureCardPreview({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const bundle: TourBundle & { route: NonNullable<TourBundle["route"]> } = {
    route: {
      id: "r", projectId: "harness", name: "HouseWalk ground floor", revision: 1,
      captureNotes: "High mast 7 ft, low 4 ft. Walk with the mast ahead of you. Close-ups of every sleeve and fire-stop.",
    },
    chapters: [
      { id: "c1", name: "Kitchen", sortOrder: 0, retiredAt: null, replacedBy: null },
      { id: "c2", name: "Living room", sortOrder: 1, retiredAt: null, replacedBy: null },
    ],
    checkpoints: [
      cp("a", "c1", "Kitchen sink", "Face the window; include the full counter run", 0),
      cp("b", "c1", "Pantry door", null, 1),
      cp("c", "c2", "Living room window", "Pause two seconds facing the window wall", 2),
      cp("d", "c2", "Back patio door", "Close-up of the threshold", 3),
    ],
    visits: [{
      walkthroughId: WALK, title: "Harness visit", capturedAt: "2026-09-10T15:00:00Z", routeId: "r", clientPublishedAt: null,
      stillsReviewedAt: null, privacyReviewedAt: null,
      clips: [{ id: CLIP, durationS: 51, sortOrder: 0, hasPublicProxy: true, lookCone: DEFAULT_LOOK_CONE, maskVisible: false, maskCoverage: 0.03 }],
    }],
    marks: [mark("a", 8), mark("b", 15), mark("c", 24)],
  };
  return (
    <CaptureCard
      projectId="harness"
      bundle={bundle}
      stillUrl={() => `/api/spatial-walkthrough/public/${token ?? ""}/media?clip=${CLIP}&kind=hero`}
    />
  );
}
