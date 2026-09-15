import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapProjectCards, type ProjectThumbRow } from "./resolve-project-thumbs";

export type ClientHomeProject = ProjectThumbRow;

export type ClientHomeData = {
  projects: ClientHomeProject[];
};

const EMPTY: ClientHomeData = { projects: [] };

export async function loadClientHomeData(orgId: string | null): Promise<ClientHomeData> {
  if (!orgId) return EMPTY;

  const admin = createAdminClient();

  const { data } = await admin
    .from("projects")
    .select("id, name, status, created_at, thumbnail_url, metadata")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);

  const projects = await mapProjectCards(admin, orgId, data ?? []);

  return { projects: projects.filter((p) => !p.isFixture) };
}
