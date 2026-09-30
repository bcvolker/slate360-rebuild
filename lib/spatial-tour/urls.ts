/** Where the operator Tour UI loads media and stills. Injectable so preview harnesses can render without a session. */
export type TourUrls = {
  media: (walkthroughId: string, clipId: string, kind: "proxy" | "poster") => string;
  still: (markId: string) => string;
};

export function operatorTourUrls(projectId: string): TourUrls {
  return {
    // Public policy: the operator-free derivative, the timeline clients play and stills come from.
    media: (walkthroughId, clipId, kind) => `/api/spatial-walkthrough/${walkthroughId}/media?clip=${clipId}&policy=public&kind=${kind}`,
    still: (markId) => `/api/projects/${projectId}/tour/stills/${markId}`,
  };
}
