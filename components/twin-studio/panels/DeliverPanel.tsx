import { Share2 } from "lucide-react";

/** F4 (not yet built): share-link management, branding_snapshot, exports panel. */
export function DeliverPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Share2 className="size-6 text-[var(--graphite-muted)]" aria-hidden />
      <p className="text-sm font-medium text-zinc-200">Deliver — coming in Phase F4</p>
      <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
        Will bring share-link management (expiry/max-views/list/revoke), org branding on shares,
        and an exports panel (.spz/.ply, floor-plan SVG/DXF, raw assets) into the studio directly.
      </p>
    </div>
  );
}
