/**
 * ROUTE-FIX (2026-08-07): desktop surfaces open twins in the Twin Studio
 * cockpit. /digital-twin/twins/[id] is the phone-first viewer — on a desktop
 * browser it renders as a narrow left-pinned column and only ever shows the
 * PUBLISHED model, which is how Brian ended up staring at a week-old rough
 * model while the improved versions sat unpublished behind Studio's Preview.
 *
 * Stored notification link_paths keep pointing at the mobile page (the mobile
 * inbox needs them); desktop widgets rewrite at render time instead. Note:
 * /twin-studio is gated by canAccessTwinDesktop (CEO/beta/entitled org) — the
 * same audience the desktop dashboard's twin widgets serve today. If that gate
 * ever widens, this helper is the single place desktop twin routing lives.
 */
export function desktopTwinHref(path: string | null | undefined): string {
  if (!path) return "#";
  const match = path.match(/^\/digital-twin\/twins\/([0-9a-fA-F-]+)$/);
  return match ? `/twin-studio/${match[1]}` : path;
}

export function desktopTwinStudioHref(spaceId: string): string {
  return `/twin-studio/${spaceId}`;
}
