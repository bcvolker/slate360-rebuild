export type VnextExploreHrefState = {
  rep: string | null;
  source?: string | null;
  present?: boolean;
  /** Opaque Slice 5 (Items) context — carried through unread and unmodified in this slice. Never
   *  looked up, never rendered as an overlay here; only preserved so a future Items feature can
   *  rely on it surviving representation/source/presentation-mode changes. */
  item?: string | null;
};

/**
 * Single place that builds Explore URLs so representation switching, source switching,
 * presentation mode, and the (currently opaque) item context all agree on the same query param
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
  if (state.present) params.set("present", "1");
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
