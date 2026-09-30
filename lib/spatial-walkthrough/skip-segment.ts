export function postSkipSegment(walkthroughId: string, clipId: string, t: number): Promise<Response> {
  return fetch(`/api/spatial-walkthrough/${walkthroughId}/redactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clipId,
      tStart: t,
      tEnd: t + 2.5,
      mode: "skip",
      policy: "client",
      reason: "Coverage too limited",
    }),
  });
}
