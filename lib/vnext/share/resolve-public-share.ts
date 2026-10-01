import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { capabilityForRepresentation } from "@/lib/vnext/scope/capabilities";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { clientMayReadSource } from "@/lib/vnext/release/source-visible";
import type { ReleaseRepresentation } from "@/lib/vnext/release/release-rules";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import type { VnextSavedView } from "@/lib/vnext/views/saved-view-types";
import { claimShareOpen, readSavedView, readShareByToken } from "./share-store";
import {
  evidenceIsPublic,
  publicPortalSections,
  shareLinkStatus,
  type PublicSection,
  type ShareLinkRecord,
} from "./share-rules";

type Admin = ReturnType<typeof createAdminClient>;

export type PublicShareContext =
  | { state: "unavailable" }
  | {
      state: "active";
      token: string;
      projectId: string;
      projectName: string;
      target: ShareLinkRecord["targetType"];
      sections: PublicSection[];
      view: VnextSavedView | null;
    };

function publicationRepresentation(representation: string): Exclude<ReleaseRepresentation, "thermal"> | null {
  if (representation === "reality" || representation === "geometry") return representation;
  if (representation === "360") return "pano360";
  if (representation === "plan") return "plans";
  return null;
}

async function viewIsPublic(admin: Admin, view: VnextSavedView): Promise<boolean> {
  const publication = publicationRepresentation(view.representation);
  const capability = capabilityForRepresentation(view.representation);
  if (!publication || !capability) return false;
  const scope = await readClientScope(admin, view.projectId);
  const published = await clientMayReadSource(admin, view.projectId, publication, view.sourceId, null);
  return evidenceIsPublic({
    representation: view.representation,
    capabilityIncluded: canClientSeeCapability(scope, capability),
    published,
  });
}

export async function resolvePublicShare(token: string): Promise<{ admin: Admin; share: PublicShareContext }> {
  const admin = createAdminClient();
  const unavailable = { admin, share: { state: "unavailable" as const } };
  const row = await readShareByToken(admin, token);
  if (!row || shareLinkStatus(row, new Date()) !== "active") return unavailable;
  const { data: project } = await admin.from("projects").select("id, name").eq("id", row.projectId).maybeSingle();
  if (!project?.id || !project?.name) return unavailable;
  const scope = await readClientScope(admin, row.projectId);
  if (row.targetType === "saved_view") {
    const view = row.savedViewId ? await readSavedView(admin, row.savedViewId) : null;
    if (!view || view.projectId !== row.projectId || !(await viewIsPublic(admin, view))) return unavailable;
    if (view.representation === "thermal") return unavailable;
    return {
      admin,
      share: {
        state: "active",
        token,
        projectId: project.id,
        projectName: String(project.name),
        target: "saved_view",
        sections: [],
        view,
      },
    };
  }
  return {
    admin,
    share: {
      state: "active",
      token,
      projectId: project.id,
      projectName: String(project.name),
      target: "project",
      sections: publicPortalSections(scope),
      view: null,
    },
  };
}

export async function claimResolvedShare(admin: Admin, token: string): Promise<boolean> {
  return claimShareOpen(admin, token);
}

export function exploreRepresentation(view: VnextSavedView): VnextExploreRepresentation | null {
  if (view.representation === "thermal") return null;
  return view.representation;
}
