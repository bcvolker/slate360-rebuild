import "server-only";

import { APP_URL } from "@/lib/email";
import { capabilityForRepresentation } from "@/lib/vnext/scope/capabilities";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";
import type { ReleaseRepresentation } from "@/lib/vnext/release/release-rules";
import { insertShareLink, readSavedView, revokeShareLink } from "./share-store";
import {
  assessShareTarget,
  newShareToken,
  parseExpiresOn,
  parseShareLabel,
  sharePath,
  type ShareViewFacts,
} from "./share-rules";

type Admin = any;

export type ShareCommandResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 404 | 409; error: string };

function publicationRepresentation(representation: string): Exclude<ReleaseRepresentation, "thermal"> | null {
  if (representation === "reality" || representation === "geometry") return representation;
  if (representation === "360") return "pano360";
  if (representation === "plan") return "plans";
  return null;
}

export async function loadShareViewFacts(admin: Admin, viewId: string): Promise<ShareViewFacts | null> {
  const view = await readSavedView(admin, viewId);
  if (!view) return null;
  if (view.representation === "thermal") {
    const thermalCapability = capabilityForRepresentation("thermal");
    if (!thermalCapability) return null;
    const scope = await readClientScope(admin, view.projectId);
    return {
      projectId: view.projectId,
      representation: "thermal",
      capabilityIncluded: canClientSeeCapability(scope, thermalCapability),
      published: false,
    };
  }
  const publication = publicationRepresentation(view.representation);
  const capability = capabilityForRepresentation(view.representation);
  if (!publication || !capability) return null;
  const scope = await readClientScope(admin, view.projectId);
  const published = await clientMayReadSource(admin, view.projectId, publication, view.sourceId, null);
  return {
    projectId: view.projectId,
    representation: view.representation,
    capabilityIncluded: canClientSeeCapability(scope, capability),
    published,
  };
}

export function rejectUnlessOwner(canAccessOperationsConsole: boolean): ShareCommandResult | null {
  if (!canAccessOperationsConsole) return { ok: false, status: 404, error: "Not found" };
  return null;
}

export async function createShareLink(
  admin: Admin,
  input: {
    actorId: string;
    allowedProjectIds: string[];
    target: string;
    projectId: string;
    savedViewId: string | null;
    label: string | null;
    expiresOn: string | null;
    now: Date;
  },
): Promise<ShareCommandResult> {
  const label = parseShareLabel(input.label);
  const expiry = parseExpiresOn(input.expiresOn, input.now);
  if (!label.ok || !expiry.ok) return { ok: false, status: 400, error: "Invalid request" };
  const view = input.target === "saved_view" && input.savedViewId ? await loadShareViewFacts(admin, input.savedViewId) : null;
  const decision = assessShareTarget({
    target: input.target,
    projectAllowed: input.allowedProjectIds.includes(input.projectId),
    projectId: input.projectId,
    view,
  });
  if (!decision.ok) return decision;
  const token = newShareToken();
  const saved = await insertShareLink(admin, {
    token,
    projectId: input.projectId,
    targetType: decision.target,
    savedViewId: decision.target === "saved_view" ? input.savedViewId : null,
    createdBy: input.actorId,
    label: label.label,
    expiresAt: expiry.expiresAt,
  });
  if (!saved) return { ok: false, status: 400, error: "Invalid request" };
  return { ok: true, url: `${APP_URL}${sharePath(saved.token)}` };
}

export async function revokeOwnedShare(
  admin: Admin,
  linkId: string,
  allowedProjectIds: string[],
): Promise<ShareCommandResult> {
  const revoked = await revokeShareLink(admin, linkId, allowedProjectIds);
  if (!revoked) return { ok: false, status: 404, error: "Not found" };
  return { ok: true, url: "" };
}
