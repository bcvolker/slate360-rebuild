import type { AccessPolicy } from "./types";
import { pinVisibleOnPolicy, attachmentVisibleOnPolicy } from "./pins";
import { hiddenWaypointIds, redactionForRecipient, rulesForPolicy, type RedactionRule } from "./redaction";
import { visibleWaypoints, toWaypoint } from "./waypoints";

export function filterRuntime(args: {
  policy: AccessPolicy;
  waypoints: Record<string, unknown>[];
  pins: Array<Record<string, unknown> & { visibility: string }>;
  attachments: Array<{ pin_id: string; visible_on_public: boolean }>;
  redactions: RedactionRule[];
  clipId: string;
}) {
  const scoped = rulesForPolicy(args.redactions, args.policy);
  const hidden = hiddenWaypointIds(scoped, args.clipId);
  const wps = visibleWaypoints(args.waypoints.map(toWaypoint), args.clipId, hidden);
  const pins = args.pins.filter((p) => pinVisibleOnPolicy(p.visibility as "client" | "public" | "internal", args.policy));
  const pinIds = new Set(pins.map((p) => String(p.id)));
  const attachments = args.attachments.filter(
    (a) => pinIds.has(a.pin_id) && attachmentVisibleOnPolicy(a.visible_on_public, args.policy),
  );
  return {
    waypoints: wps,
    pins,
    attachments,
    redactions: scoped.map((r) => redactionForRecipient(r, args.policy)),
  };
}
