"use client";

import { useEffect } from "react";

/**
 * The SW360 Field System tokens (app/globals.css [data-app="sw360"]) are
 * normally scoped by a wrapper div in app/sw360/layout.tsx — fine for
 * screens that live entirely under app/sw360/**, but the shared capture-v2
 * engine (ghost mode, angle strip, filmstrip, markup, top bar, bottom rail)
 * lives at /site-walk/capture-v2, entirely outside that tree, so it never
 * gets [data-app="sw360"] and always renders the legacy Graphite Glass
 * tokens even when launched from the SW360 app (Phase 2 of
 * SITEWALK360_UI_REBUILD_PHASE_PLAN.md).
 *
 * Mounted at the root layout (app-wide, same pattern as NativeChromeInit),
 * this sets data-app="sw360" on <html> itself when the SW360 host is
 * detected, so the attribute-selector CSS scope applies everywhere in the
 * SW360 native app regardless of which route tree rendered the screen.
 * Zero effect on the legacy Slate360 app (hostname never matches there).
 */
export function SW360HostThemeInit() {
  useEffect(() => {
    if (window.location.hostname !== "app.sitewalk360.app") return;
    document.documentElement.dataset.app = "sw360";
  }, []);
  return null;
}
