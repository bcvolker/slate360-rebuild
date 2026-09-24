export type VnextExploreHrefState = {
  rep: string | null;
  source?: string | null;
  present?: boolean;
  /** Carried through Explore URLs as ?item=. Slice 5 reads it to focus a known item; this builder only serializes it. */
  item?: string | null;
  /** Saved evidence view. The record, not the query source, is what opens. */
  view?: string | null;
  guide?: string | null;
};

/**
 * Single place that builds Explore URLs so representation switching, source switching,
 * presentation mode, and item context all agree on the same query param
 * names (?rep=, ?source=, ?present=1, ?item=) and never drop state the caller didn't intend to
 * change. Takes the page's own base path (not a project id) so the same component tree can target
 * either the real authenticated route or an unauthenticated /preview/vnext/project/explore sandbox
 * — the latter is what e2e/vnext/explore.spec.ts drives, matching how every other vNext page is
 * tested.
 */
export function vnextExploreHref(basePath: string, state: VnextExploreHrefState): string {
  const params = new URLSearchParams();
  if (state.rep) params.set("rep", state.rep);
  if (state.source) params.set("source", state.source);
  if (state.item) params.set("item", state.item);
  if (state.view) params.set("view", state.view);
  if (state.guide) params.set("guide", state.guide);
  if (state.present) params.set("present", "1");
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
