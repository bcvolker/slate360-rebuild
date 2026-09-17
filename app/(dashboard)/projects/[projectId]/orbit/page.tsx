import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ProjectOrbitTab } from "@/components/projects/ProjectOrbitTab";

type ProjectMetadata = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  location?: { lat?: number; lng?: number; latitude?: number; longitude?: number };
};

function readCoord(meta: ProjectMetadata | null | undefined): { lat?: number; lng?: number } {
  if (!meta) return {};
  const loc = meta.location ?? {};
  const lat = Number(meta.lat ?? meta.latitude ?? loc.lat ?? loc.latitude);
  const lng = Number(meta.lng ?? meta.longitude ?? loc.lng ?? loc.longitude);
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export default async function ProjectOrbitPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}/orbit`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name, metadata");
  if (!project) notFound();

  const row = project as { name?: string; metadata?: ProjectMetadata | null };
  const coords = readCoord(row.metadata);

  return (
    <ProjectOrbitTab
      projectId={projectId}
      projectName={row.name ?? "Project"}
      lat={coords.lat}
      lng={coords.lng}
    />
  );
}
